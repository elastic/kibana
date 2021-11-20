/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ListClient } from '../../../../../../lists/server';
import { getInputIndex } from '../get_input_output_index';
import { RuleRangeTuple, BulkCreate, WrapHits } from '../types';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { createThreatSignals } from '../threat_mapping/create_threat_signals';
import { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';

export const threatMatchExecutor = async ({
  completeRule,
  tuple,
  listClient,
  exceptionItems,
  services,
  version,
  searchAfterSize,
  logger,
  eventsTelemetry,
  experimentalFeatures,
  buildRuleMessage,
  bulkCreate,
  wrapHits,
}: {
  completeRule: CompleteRule<ThreatRuleParams>;
  tuple: RuleRangeTuple;
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  experimentalFeatures: ExperimentalFeatures;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}) => {
  const ruleParams = completeRule.ruleParams;
  const inputIndex = await getInputIndex({
    experimentalFeatures,
    services,
    version,
    index: ruleParams.index,
  });
  return createThreatSignals({
    alertId: completeRule.alertId,
    buildRuleMessage,
    bulkCreate,
    completeRule,
    concurrentSearches: ruleParams.concurrentSearches ?? 1,
    eventsTelemetry,
    exceptionItems,
    filters: ruleParams.filters ?? [],
    inputIndex,
    itemsPerSearch: ruleParams.itemsPerSearch ?? 9000,
    language: ruleParams.language,
    listClient,
    logger,
    outputIndex: ruleParams.outputIndex,
    query: ruleParams.query,
    savedId: ruleParams.savedId,
    searchAfterSize,
    services,
    threatFilters: ruleParams.threatFilters ?? [],
    threatIndex: ruleParams.threatIndex,
    threatIndicatorPath: ruleParams.threatIndicatorPath,
    threatLanguage: ruleParams.threatLanguage,
    threatMapping: ruleParams.threatMapping,
    threatQuery: ruleParams.threatQuery,
    tuple,
    type: ruleParams.type,
    wrapHits,
  });
};
