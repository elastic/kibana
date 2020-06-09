/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash/fp';
import set from 'set-value';
import { SearchResponse } from 'elasticsearch';

import { Logger } from '../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { AnomalyResults, Anomaly } from '../../machine_learning';

interface BulkCreateMlSignalsParams {
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

interface EcsAnomaly extends Anomaly {
  '@timestamp': string;
}

export const transformAnomalyFieldsToEcs = (anomaly: Anomaly): EcsAnomaly => {
  const {
    by_field_name: entityName,
    by_field_value: entityValue,
    influencers,
    timestamp,
  } = anomaly;
  let errantFields = (influencers ?? []).map((influencer) => ({
    name: influencer.influencer_field_name,
    value: influencer.influencer_field_values,
  }));

  if (entityName && entityValue) {
    errantFields = [...errantFields, { name: entityName, value: [entityValue] }];
  }

  const omitDottedFields = omit(errantFields.map((field) => field.name));
  const setNestedFields = errantFields.map((field) => (_anomaly: Anomaly) =>
    set(_anomaly, field.name, field.value)
  );
  const setTimestamp = (_anomaly: Anomaly) =>
    set(_anomaly, '@timestamp', new Date(timestamp).toISOString());

  return flow(omitDottedFields, setNestedFields, setTimestamp)(anomaly);
};

const transformAnomalyResultsToEcs = (results: AnomalyResults): SearchResponse<EcsAnomaly> => {
  const transformedHits = results.hits.hits.map(({ _source, ...rest }) => ({
    ...rest,
    _source: transformAnomalyFieldsToEcs(_source),
  }));

  return {
    ...results,
    hits: {
      ...results.hits,
      hits: transformedHits,
    },
  };
};

export const bulkCreateMlSignals = async (
  params: BulkCreateMlSignalsParams
): Promise<SingleBulkCreateResponse> => {
  const anomalyResults = params.someResult;
  const ecsResults = transformAnomalyResultsToEcs(anomalyResults);

  return singleBulkCreate({ ...params, filteredEvents: ecsResults });
};
