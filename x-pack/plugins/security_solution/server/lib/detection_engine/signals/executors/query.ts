/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { ListClient } from '@kbn/lists-plugin/server';
import { getFilter } from '../get_filter';
import { getInputIndex } from '../get_input_output_index';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import { RuleRangeTuple, BulkCreate, WrapHits } from '../types';
import { ITelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { CompleteRule, SavedQueryRuleParams, QueryRuleParams } from '../../schemas/rule_schemas';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForQueryAlert } from '../reason_formatters';
import { withSecuritySpan } from '../../../../utils/with_security_span';

export const queryExecutor = async ({
  completeRule,
  tuple,
  listClient,
  exceptionItems,
  experimentalFeatures,
  services,
  version,
  searchAfterSize,
  logger,
  eventsTelemetry,
  buildRuleMessage,
  bulkCreate,
  wrapHits,
}: {
  completeRule: CompleteRule<QueryRuleParams | SavedQueryRuleParams>;
  tuple: RuleRangeTuple;
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  experimentalFeatures: ExperimentalFeatures;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  logger: Logger;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('queryExecutor', async () => {
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index: ruleParams.index,
    });

    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: inputIndex,
      lists: exceptionItems,
    });

    return searchAfterAndBulkCreate({
      tuple,
      listClient,
      exceptionsList: exceptionItems,
      completeRule,
      services,
      logger,
      eventsTelemetry,
      id: completeRule.alertId,
      inputIndexPattern: inputIndex,
      filter: esFilter,
      pageSize: searchAfterSize,
      buildReasonMessage: buildReasonMessageForQueryAlert,
      buildRuleMessage,
      bulkCreate,
      wrapHits,
    });
  });
};
