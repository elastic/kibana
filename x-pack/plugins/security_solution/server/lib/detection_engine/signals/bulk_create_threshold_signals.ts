/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuidv5 from 'uuid/v5';
import { reduce, get, isEmpty } from 'lodash/fp';
import set from 'set-value';

import { Threshold } from '../../../../common/detection_engine/schemas/common/schemas';
import { Logger } from '../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { SignalSearchResponse, SignalSourceHit, ThresholdAggregationBucket } from './types';
import { BuildRuleMessage } from './rule_messages';

// used to generate constant Threshold Signals ID when run with the same params
const NAMESPACE_ID = '0684ec03-7201-4ee0-8ee0-3a3f6b2479b2';

interface BulkCreateThresholdSignalsParams {
  actions: RuleAlertAction[];
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  inputIndexPattern: string[];
  logger: Logger;
  id: string;
  filter: unknown;
  signalsIndex: string;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  refresh: RefreshTypes;
  tags: string[];
  throttle: string;
  startedAt: Date;
  buildRuleMessage: BuildRuleMessage;
}

interface FilterObject {
  bool?: {
    filter?: FilterObject | FilterObject[];
    should?: Array<Record<string, Record<string, string>>>;
  };
}

const injectFirstMatch = (
  hit: SignalSourceHit,
  match: string | object | Record<string, string>
): Record<string, string> | undefined => {
  if (match != null) {
    if (typeof match === 'string') {
      return { exists: get(match, hit._source) } as Record<string, string>;
    }
    for (const key of Object.keys(match)) {
      return { [key]: get(key, hit._source) } as Record<string, string>;
    }
  }
};

const getNestedQueryFilters = (
  hit: SignalSourceHit,
  filtersObj: FilterObject
): Record<string, string> => {
  if (Array.isArray(filtersObj.bool?.filter)) {
    return reduce(
      (acc, filterItem) => {
        const nestedFilter = getNestedQueryFilters(hit, filterItem);

        if (nestedFilter) {
          return { ...acc, ...nestedFilter };
        }

        return acc;
      },
      {},
      filtersObj.bool?.filter
    );
  } else {
    return (
      (filtersObj.bool?.should &&
        filtersObj.bool?.should[0] &&
        (injectFirstMatch(hit, filtersObj.bool.should[0].match) ||
          injectFirstMatch(hit, filtersObj.bool.should[0].match_phrase) ||
          injectFirstMatch(hit, filtersObj.bool.should[0].exists.field))) ??
      {}
    );
  }
};

export const getThresholdSignalQueryFields = (hit: SignalSourceHit, filter: unknown) => {
  const filters = get('bool.filter', filter);

  return reduce(
    (acc, item) => {
      if (item.match_phrase) {
        return { ...acc, ...injectFirstMatch(hit, item.match_phrase) };
      }

      if (
        item.bool?.should &&
        (item.bool.should[0].match ||
          item.bool.should[0].match_phrase ||
          item.bool.should[0].exists)
      ) {
        return {
          ...acc,
          ...(injectFirstMatch(hit, item.bool.should[0].match) ||
            injectFirstMatch(hit, item.bool.should[0].match_phrase) ||
            injectFirstMatch(hit, item.bool.should[0].exists.field)),
        };
      }

      if (item.bool?.filter) {
        return { ...acc, ...getNestedQueryFilters(hit, item) };
      }

      return acc;
    },
    {},
    filters
  );
};

const getTransformedHits = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  threshold: Threshold,
  ruleId: string,
  filter: unknown
) => {
  if (isEmpty(threshold.field)) {
    const totalResults =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total.value;

    if (totalResults < threshold.value) {
      return [];
    }

    const source = {
      '@timestamp': new Date().toISOString(),
      threshold_count: totalResults,
      // TODO: how to get signal query fields for this case???
      // ...signalQueryFields,
    };

    return [
      {
        _index: inputIndex,
        _id: uuidv5(`${ruleId}${startedAt}${threshold.field}`, NAMESPACE_ID),
        _source: source,
      },
    ];
  }

  if (!results.aggregations?.threshold) {
    return [];
  }

  return results.aggregations.threshold.buckets
    .map(
      ({ key, doc_count: docCount, top_threshold_hits: topHits }: ThresholdAggregationBucket) => {
        const hit = topHits.hits.hits[0];
        if (hit == null) {
          return null;
        }

        const source = {
          '@timestamp': new Date().toISOString(), // TODO: use timestamp of latest event?
          threshold_count: docCount,
          ...getThresholdSignalQueryFields(hit, filter),
        };

        set(source, threshold.field, key);

        return {
          _index: inputIndex,
          _id: uuidv5(`${ruleId}${startedAt}${threshold.field}${key}`, NAMESPACE_ID),
          _source: source,
        };
      }
    )
    .filter((bucket: ThresholdAggregationBucket) => bucket != null);
};

export const transformThresholdResultsToEcs = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  filter: unknown,
  threshold: Threshold,
  ruleId: string
): SignalSearchResponse => {
  const transformedHits = getTransformedHits(
    results,
    inputIndex,
    startedAt,
    threshold,
    ruleId,
    filter
  );
  const thresholdResults = {
    ...results,
    hits: {
      ...results.hits,
      hits: transformedHits,
    },
  };

  set(thresholdResults, 'results.hits.total', transformedHits.length);

  return thresholdResults;
};

export const bulkCreateThresholdSignals = async (
  params: BulkCreateThresholdSignalsParams
): Promise<SingleBulkCreateResponse> => {
  const thresholdResults = params.someResult;
  const ecsResults = transformThresholdResultsToEcs(
    thresholdResults,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.filter,
    params.ruleParams.threshold!,
    params.ruleParams.ruleId
  );
  const buildRuleMessage = params.buildRuleMessage;

  return singleBulkCreate({ ...params, filteredEvents: ecsResults, buildRuleMessage });
};
