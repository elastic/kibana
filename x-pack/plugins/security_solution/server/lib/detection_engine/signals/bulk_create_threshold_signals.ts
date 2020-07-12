/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { reduce, get, isEmpty } from 'lodash/fp';
import set from 'set-value';

import { Threshold } from '../../../../common/detection_engine/schemas/common/schemas';
import { Logger } from '../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { SignalSearchResponse } from './types';

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
}

interface FilterObject {
  bool?: {
    filter?: FilterObject | FilterObject[];
    should?: Array<Record<string, Record<string, string>>>;
  };
}

const getNestedQueryFilters = (filtersObj: FilterObject): Record<string, string> => {
  if (Array.isArray(filtersObj.bool?.filter)) {
    return reduce(
      (acc, filterItem) => {
        const nestedFilter = getNestedQueryFilters(filterItem);

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
        (filtersObj.bool.should[0].match || filtersObj.bool.should[0].match_phrase)) ??
      {}
    );
  }
};

export const getThresholdSignalQueryFields = (filter: unknown) => {
  const filters = get('bool.filter', filter);

  return reduce(
    (acc, item) => {
      if (item.match_phrase) {
        return { ...acc, ...item.match_phrase };
      }

      if (item.bool.should && (item.bool.should[0].match || item.bool.should[0].match_phrase)) {
        return { ...acc, ...(item.bool.should[0].match || item.bool.should[0].match_phrase) };
      }

      if (item.bool?.filter) {
        return { ...acc, ...getNestedQueryFilters(item) };
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
  threshold: Threshold,
  signalQueryFields: Record<string, string>
) => {
  if (isEmpty(threshold.field)) {
    const totalResults = results.hits.total.value;

    if (totalResults < threshold.value) {
      return [];
    }

    const source = {
      '@timestamp': new Date().toISOString(),
      threshold_count: totalResults,
      ...signalQueryFields,
    };

    return [
      {
        _index: inputIndex,
        _id: uuid.v4(),
        _source: source,
      },
    ];
  }

  if (!results.aggregations?.threshold) {
    return [];
  }

  return results.aggregations.threshold.buckets.map(
    ({ key, doc_count }: { key: string; doc_count: number }) => {
      const source = {
        '@timestamp': new Date().toISOString(),
        threshold_count: doc_count,
        ...signalQueryFields,
      };

      set(source, threshold.field, key);

      return {
        _index: inputIndex,
        _id: uuid.v4(),
        _source: source,
      };
    }
  );
};

const transformThresholdResultsToEcs = (
  results: SignalSearchResponse,
  inputIndex: string,
  filter: unknown,
  threshold: Threshold
): SignalSearchResponse => {
  const signalQueryFields = getThresholdSignalQueryFields(filter);
  const transformedHits = getTransformedHits(results, inputIndex, threshold, signalQueryFields);
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
    params.filter,
    params.ruleParams.threshold!
  );

  return singleBulkCreate({ ...params, filteredEvents: ecsResults });
};
