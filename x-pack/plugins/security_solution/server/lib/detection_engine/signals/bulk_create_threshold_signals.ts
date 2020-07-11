/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { flow, omit, reduce, get, isEmpty } from 'lodash/fp';
import set from 'set-value';
import { SearchResponse } from 'elasticsearch';

import { Logger } from '../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { AnomalyResults, Anomaly } from '../../machine_learning';

interface BulkCreateThresholdSignalsParams {
  actions: RuleAlertAction[];
  someResult: AnomalyResults;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
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

interface ThresholdResults {}

const getNestedQueryFilters = (filtersObj) => {
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
      filtersObj.bool.filter
    );
  } else {
    return filtersObj.bool.should && filtersObj.bool.should[0].match;
  }
};

const getThresholdSignalQueryFields = (filter) => {
  const filters = get('bool.filter', filter);

  return reduce(
    (acc, item) => {
      if (item.match_phrase) {
        return { ...acc, ...item.match_phrase };
      }

      if (item.bool.should && item.bool.should[0].match) {
        return { ...acc, ...item.bool.should[0].match };
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

const getTransformedHits = (results, threshold, signalQueryFields) => {
  if (isEmpty(threshold.field)) {
    if (results.hits.total.value < threshold.value) {
      return [];
    }

    const source = {
      '@timestamp': new Date().toISOString(),
      ...signalQueryFields,
    };

    return [
      {
        _index: '',
        _id: uuid.v4(),
        _source: source,
        threshold_count: results.hits.total.value,
      },
    ];
  }

  if (!results.aggregations?.threshold) {
    return [];
  }

  return results.aggregations.threshold.buckets.map(({ key, doc_count }) => {
    const source = {
      '@timestamp': new Date().toISOString(),
      ...signalQueryFields,
    };

    set(source, threshold.field, key);

    return {
      // ...rest,
      _index: '',
      _id: uuid.v4(),
      _source: source,
      threshold_count: doc_count,
    };
  });
};

const transformThresholdResultsToEcs = (
  results: ThresholdResults,
  filter,
  threshold
): SearchResponse<EcsAnomaly> => {
  console.log(
    'transformThresholdResultsToEcs',
    // JSON.stringify(results),
    JSON.stringify(filter)
    // JSON.stringify(threshold)
  );

  const signalQueryFields = getThresholdSignalQueryFields(filter);

  console.log('signalQueryFields', JSON.stringify(signalQueryFields, null, 2));

  const transformedHits = getTransformedHits(results, threshold, signalQueryFields);

  const thresholdResults = {
    ...results,
    hits: {
      ...results.hits,
      hits: transformedHits,
    },
  };

  set(thresholdResults, 'this.total.value', transformedHits.length);

  return thresholdResults;
};

export const bulkCreateThresholdSignals = async (
  params: BulkCreateThresholdSignalsParams
): Promise<SingleBulkCreateResponse> => {
  const thresholdResults = params.someResult;
  const ecsResults = transformThresholdResultsToEcs(
    thresholdResults,
    params.filter,
    params.threshold
  );

  console.log('ruleParams', JSON.stringify(params.ruleParams, null, 2));

  return singleBulkCreate({ ...params, filteredEvents: ecsResults });
};
