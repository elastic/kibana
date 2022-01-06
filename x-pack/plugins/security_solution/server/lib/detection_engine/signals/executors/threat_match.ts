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
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { IRuleDataClient } from '../../../../../../rule_registry/server';
import { DETECTION_ENGINE_MAX_PER_PAGE } from '../../../../../common/cti/constants';

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
  percolatorRuleDataClient,
  withTimeout,
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
  percolatorRuleDataClient: IRuleDataClient;
  withTimeout: <T>(func: () => Promise<T>, funcName: string) => Promise<T>;
}) => {
  const {
    concurrentSearches,
    filters,
    index,
    itemsPerSearch,
    language,
    outputIndex,
    query,
    savedId,
    threatFilters,
    threatIndex,
    threatIndicatorPath,
    threatLanguage,
    threatMapping,
    threatQuery,
    type,
  } = completeRule.ruleParams;

  return withSecuritySpan('threatMatchExecutor', async () => {
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index,
    });
    return createThreatSignals({
      alertId: completeRule.alertId,
      buildRuleMessage,
      bulkCreate,
      completeRule,
      concurrentSearches: concurrentSearches ?? 1,
      eventsTelemetry,
      exceptionItems,
      filters: filters ?? [],
      inputIndex,
      itemsPerSearch: itemsPerSearch ?? DETECTION_ENGINE_MAX_PER_PAGE,
      language,
      listClient,
      logger,
      outputIndex,
      percolatorRuleDataClient,
      query,
      savedId,
      searchAfterSize,
      services,
      threatFilters: threatFilters ?? [],
      threatIndex,
      threatIndicatorPath,
      threatLanguage,
      threatMapping,
      threatQuery,
      tuple,
      type,
      withTimeout,
      wrapHits,
    });
  });
};
