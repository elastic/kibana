/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { flow, omit } from 'lodash/fp';
import set from 'set-value';

import { Logger } from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '../../../../../alerting/server';
import { GenericBulkCreateResponse } from '../rule_types/factories';
import { Anomaly } from '../../machine_learning';
import { BuildRuleMessage } from './rule_messages';
import { BulkCreate, WrapHits } from './types';
import { CompleteRule, MachineLearningRuleParams } from '../schemas/rule_schemas';
import { buildReasonMessageForMlAlert } from './reason_formatters';
import { BaseFieldsLatest } from '../../../../common/detection_engine/schemas/alerts';

interface BulkCreateMlSignalsParams {
  anomalyHits: Array<estypes.SearchHit<Anomaly>>;
  completeRule: CompleteRule<MachineLearningRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  id: string;
  signalsIndex: string;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
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
  const setNestedFields = errantFields.map(
    (field) => (_anomaly: Anomaly) => set(_anomaly, field.name, field.value)
  );
  const setTimestamp = (_anomaly: Anomaly) =>
    set(_anomaly, '@timestamp', new Date(timestamp).toISOString());

  return flow(omitDottedFields, setNestedFields, setTimestamp)(anomaly);
};

const transformAnomalyResultsToEcs = (
  results: Array<estypes.SearchHit<Anomaly>>
): Array<estypes.SearchHit<EcsAnomaly>> => {
  return results.map(({ _source, ...rest }) => ({
    ...rest,
    _source: transformAnomalyFieldsToEcs(
      // @ts-expect-error @elastic/elasticsearch _source is optional
      _source
    ),
  }));
};

export const bulkCreateMlSignals = async (
  params: BulkCreateMlSignalsParams
): Promise<GenericBulkCreateResponse<BaseFieldsLatest>> => {
  const anomalyResults = params.anomalyHits;
  const ecsResults = transformAnomalyResultsToEcs(anomalyResults);

  const wrappedDocs = params.wrapHits(ecsResults, buildReasonMessageForMlAlert);
  return params.bulkCreate(wrappedDocs);
};
