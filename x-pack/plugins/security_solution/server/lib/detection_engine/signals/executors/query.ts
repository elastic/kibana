/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { firstValueFrom } from 'rxjs';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { Filter } from '@kbn/es-query';
import { getFilter } from '../get_filter';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import type { RuleRangeTuple, BulkCreate, WrapHits } from '../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { CompleteRule, UnifiedQueryRuleParams } from '../../rule_schema';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForQueryAlert } from '../reason_formatters';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { scheduleNotificationResponseActions } from '../../rule_response_actions/schedule_notification_response_actions';
import type { SetupPlugins } from '../../../../plugin_contract';

export const queryExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  listClient,
  experimentalFeatures,
  ruleExecutionLogger,
  eventsTelemetry,
  services,
  version,
  searchAfterSize,
  bulkCreate,
  wrapHits,
  primaryTimestamp,
  secondaryTimestamp,
  unprocessedExceptions,
  exceptionFilter,
  osqueryCreateAction,
  licensing,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<UnifiedQueryRuleParams>;
  tuple: RuleRangeTuple;
  listClient: ListClient;
  experimentalFeatures: ExperimentalFeatures;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  unprocessedExceptions: ExceptionListItemSchema[];
  exceptionFilter: Filter | undefined;
  osqueryCreateAction: SetupPlugins['osquery']['osqueryCreateAction'];
  licensing: LicensingPluginSetup;
}) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('queryExecutor', async () => {
    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: inputIndex,
      exceptionFilter,
    });

    const result = await searchAfterAndBulkCreate({
      tuple,
      exceptionsList: unprocessedExceptions,
      services,
      listClient,
      ruleExecutionLogger,
      eventsTelemetry,
      inputIndexPattern: inputIndex,
      pageSize: searchAfterSize,
      filter: esFilter,
      buildReasonMessage: buildReasonMessageForQueryAlert,
      bulkCreate,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    });

    const license = await firstValueFrom(licensing.license$);
    const hasGoldLicense = license.hasAtLeast('gold');

    if (hasGoldLicense) {
      if (completeRule.ruleParams.responseActions?.length && result.createdSignalsCount) {
        scheduleNotificationResponseActions(
          {
            signals: result.createdSignals,
            responseActions: completeRule.ruleParams.responseActions,
          },
          osqueryCreateAction
        );
      }
    }

    return result;
  });
};
