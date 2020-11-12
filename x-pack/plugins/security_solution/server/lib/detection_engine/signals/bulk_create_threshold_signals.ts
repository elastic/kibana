/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuidv5 from 'uuid/v5';
import { reduce, get, isEmpty } from 'lodash/fp';
import set from 'set-value';

import {
  Threshold,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
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
  timestampOverride: TimestampOverrideOrUndefined;
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
  match: object | Record<string, string>
): Record<string, string> | undefined => {
  if (match != null) {
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
          injectFirstMatch(hit, filtersObj.bool.should[0].match_phrase))) ??
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

      if (item.bool?.should && (item.bool.should[0].match || item.bool.should[0].match_phrase)) {
        return {
          ...acc,
          ...(injectFirstMatch(hit, item.bool.should[0].match) ||
            injectFirstMatch(hit, item.bool.should[0].match_phrase)),
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
  logger: Logger,
  threshold: Threshold,
  ruleId: string,
  filter: unknown,
  timestampOverride: TimestampOverrideOrUndefined
) => {
  if (isEmpty(threshold.field)) {
    const totalResults =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total.value;

    if (totalResults < threshold.value) {
      return [];
    }

    const hit = results.hits.hits[0];
    if (hit == null) {
      logger.warn(`No hits returned, but totalResults >= threshold.value (${threshold.value})`);
      return [];
    }

    const source = {
      '@timestamp': get(timestampOverride ?? '@timestamp', hit._source),
      threshold_count: totalResults, // TODO: remove/deprecate this
      threshold_bucket: {
        count: totalResults,
        match_value: ruleId,
      },
      ...getThresholdSignalQueryFields(hit, filter),
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
          '@timestamp': get(timestampOverride ?? '@timestamp', hit._source),
          threshold_count: docCount, // TODO: remove/deprecate this
          threshold_bucket: {
            count: docCount,
            match_value: get(threshold.field, hit._source),
          },
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
  logger: Logger,
  threshold: Threshold,
  ruleId: string,
  timestampOverride: TimestampOverrideOrUndefined
): SignalSearchResponse => {
  const transformedHits = getTransformedHits(
    results,
    inputIndex,
    startedAt,
    logger,
    threshold,
    ruleId,
    filter,
    timestampOverride
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
    params.logger,
    params.ruleParams.threshold!,
    params.ruleParams.ruleId,
    params.timestampOverride
  );
  const buildRuleMessage = params.buildRuleMessage;

  return singleBulkCreate({ ...params, filteredEvents: ecsResults, buildRuleMessage });
};
