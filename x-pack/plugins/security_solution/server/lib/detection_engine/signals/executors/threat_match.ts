/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/types';
import { Logger } from 'src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ListClient } from '../../../../../../lists/server';
import { ExceptionListItemSchema } from '../../../../../common/shared_imports';
import { RefreshTypes } from '../../types';
import { getInputIndex } from '../get_input_output_index';
import { RuleRangeTuple, ThreatRuleAttributes } from '../types';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { createThreatSignals } from '../threat_mapping/create_threat_signals';

export const threatMatchExecutor = async ({
  rule,
  tuples,
  listClient,
  exceptionItems,
  services,
  version,
  searchAfterSize,
  logger,
  refresh,
  eventsTelemetry,
  buildRuleMessage,
}: {
  rule: SavedObject<ThreatRuleAttributes>;
  tuples: RuleRangeTuple[];
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  logger: Logger;
  refresh: RefreshTypes;
  eventsTelemetry: TelemetryEventsSender | undefined;
  buildRuleMessage: BuildRuleMessage;
}) => {
  const ruleParams = rule.attributes.params;
  const inputIndex = await getInputIndex(services, version, ruleParams.index);
  return createThreatSignals({
    tuples,
    threatMapping: ruleParams.threatMapping,
    query: ruleParams.query,
    inputIndex,
    type: ruleParams.type,
    filters: ruleParams.filters ?? [],
    language: ruleParams.language,
    name: rule.attributes.name,
    savedId: ruleParams.savedId,
    services,
    exceptionItems,
    listClient,
    logger,
    eventsTelemetry,
    alertId: rule.id,
    outputIndex: ruleParams.outputIndex,
    params: ruleParams,
    searchAfterSize,
    actions: rule.attributes.actions,
    createdBy: rule.attributes.createdBy,
    createdAt: rule.attributes.createdAt,
    updatedBy: rule.attributes.updatedBy,
    interval: rule.attributes.schedule.interval,
    updatedAt: rule.updated_at ?? '',
    enabled: rule.attributes.enabled,
    refresh,
    tags: rule.attributes.tags,
    throttle: rule.attributes.throttle,
    threatFilters: ruleParams.threatFilters ?? [],
    threatQuery: ruleParams.threatQuery,
    threatLanguage: ruleParams.threatLanguage,
    buildRuleMessage,
    threatIndex: ruleParams.threatIndex,
    threatIndicatorPath: ruleParams.threatIndicatorPath,
    concurrentSearches: ruleParams.concurrentSearches ?? 1,
    itemsPerSearch: ruleParams.itemsPerSearch ?? 9000,
  });
};
