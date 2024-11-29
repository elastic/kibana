/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { firstValueFrom, Observable } from 'rxjs';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { termsAggSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_agg';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AlertConsumers,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';

import { verifyAccessAndContext } from '../lib';
import { RuleAuditAction, ruleAuditEvent } from '../../rules_client/common/audit_events';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterOpts,
  AlertingAuthorizationFilterType,
} from '../../authorization';
import { AlertingRequestHandlerContext } from '../../types';
import { GetAlertIndicesAlias, ILicenseState } from '../../lib';

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.ESDSL,
  fieldNames: { ruleTypeId: ALERT_RULE_TYPE_ID, consumer: ALERT_RULE_CONSUMER },
};

export const AlertsSuggestionsSchema = {
  body: schema.object({
    field: schema.string(),
    query: schema.string(),
    filters: schema.maybe(schema.any()),
    fieldMeta: schema.maybe(schema.any()),
  }),
};

const VALID_FEATURE_IDS = new Set([
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.SLO,
  AlertConsumers.UPTIME,
]);

export function registerAlertsValueSuggestionsRoute(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  config$: Observable<ConfigSchema>,
  getAlertIndicesAlias?: GetAlertIndicesAlias,
  usageCounter?: UsageCounter
) {
  router.post(
    {
      path: '/internal/alerts/suggestions/values',
      options: { access: 'internal' },
      validate: AlertsSuggestionsSchema,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, request, response) {
        const config = await firstValueFrom(config$);
        const { field: fieldName, query, fieldMeta } = request.body;
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);
        const { savedObjects, elasticsearch } = await context.core;

        const rulesClient = (await context.alerting).getRulesClient();
        let authorizationTuple;
        let authorizedRuleType = [];
        try {
          const authorization = rulesClient.getAuthorization();
          authorizationTuple = await authorization.getFindAuthorizationFilter(
            AlertingAuthorizationEntity.Alert,
            alertingAuthorizationFilterOpts
          );
          authorizedRuleType = await authorization.getAuthorizedRuleTypes(
            AlertingAuthorizationEntity.Alert,
            VALID_FEATURE_IDS
          );
        } catch (error) {
          rulesClient.getAuditLogger()?.log(
            ruleAuditEvent({
              action: RuleAuditAction.FIND,
              error,
            })
          );
          throw error;
        }
        const spaceId = rulesClient.getSpaceId();
        const { filter: authorizationFilter } = authorizationTuple;
        const filters = [
          ...(authorizationFilter != null ? [authorizationFilter] : []),
          { term: { [SPACE_IDS]: spaceId } },
        ] as estypes.QueryDslQueryContainer[];

        const index = getAlertIndicesAlias!(
          authorizedRuleType.map((art) => art.id),
          spaceId
        ).join(',');
        try {
          const body = await termsAggSuggestions(
            config,
            savedObjects.client,
            elasticsearch.client.asInternalUser,
            index,
            fieldName,
            query,
            filters,
            fieldMeta,
            abortSignal
          );
          return response.ok({ body });
        } catch (e) {
          const kbnErr = getKbnServerError(e);
          return reportServerError(response, kbnErr);
        }
      })
    )
  );
}
