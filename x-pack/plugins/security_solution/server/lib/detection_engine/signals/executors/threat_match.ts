/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import type { RuleRangeTuple, BulkCreate, WrapHits } from '../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { BuildRuleMessage } from '../rule_messages';
import { createThreatSignals } from '../threat_mapping/create_threat_signals';
import type { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';

export const threatMatchExecutor = async ({
  inputIndex,
  runtimeMappings,
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
  primaryTimestamp,
  secondaryTimestamp,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<ThreatRuleParams>;
  tuple: RuleRangeTuple;
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  logger: Logger;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  experimentalFeatures: ExperimentalFeatures;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('threatMatchExecutor', async () => {
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
      threatIndicatorPath: ruleParams.threatIndicatorPath ?? DEFAULT_INDICATOR_SOURCE_PATH,
      threatLanguage: ruleParams.threatLanguage,
      threatMapping: ruleParams.threatMapping,
      threatQuery: ruleParams.threatQuery,
      tuple,
      type: ruleParams.type,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    });
  });
};
