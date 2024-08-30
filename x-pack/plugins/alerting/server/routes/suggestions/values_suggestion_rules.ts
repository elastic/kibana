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
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { verifyAccessAndContext } from '../lib';
import { ILicenseState } from '../../lib';
import { AlertingRequestHandlerContext } from '../../types';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterOpts,
  AlertingAuthorizationFilterType,
} from '../../authorization';
import { RuleAuditAction, ruleAuditEvent } from '../../rules_client/common/audit_events';

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.ESDSL,
  fieldNames: { ruleTypeId: 'alert.alertTypeId', consumer: 'alert.consumer' },
};

export const RulesSuggestionsSchema = {
  body: schema.object({
    field: schema.string(),
    query: schema.string(),
    filters: schema.maybe(schema.any()),
    fieldMeta: schema.maybe(schema.any()),
  }),
};

export function registerRulesValueSuggestionsRoute(
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  config$: Observable<ConfigSchema>,
  usageCounter?: UsageCounter
) {
  router.post(
    {
      path: '/internal/rules/suggestions/values',
      validate: RulesSuggestionsSchema,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, request, response) {
        const config = await firstValueFrom(config$);
        const { field: fieldName, query, fieldMeta } = request.body;
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);
        const { savedObjects, elasticsearch } = await context.core;

        const rulesClient = (await context.alerting).getRulesClient();
        let authorizationTuple;
        try {
          authorizationTuple = await rulesClient
            .getAuthorization()
            .getFindAuthorizationFilter(
              AlertingAuthorizationEntity.Rule,
              alertingAuthorizationFilterOpts
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

        const { filter: authorizationFilter } = authorizationTuple;
        const filters = [
          ...(authorizationFilter != null ? [authorizationFilter] : []),
          { term: { namespaces: rulesClient.getSpaceId() } },
        ] as estypes.QueryDslQueryContainer[];
        const index = ALERTING_CASES_SAVED_OBJECT_INDEX;
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
