/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError, transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { BulkGetRulesSourcesResponse } from '../../../../../../../common/api/detection_engine/rule_management/bulk_get_sources/bulk_get_sources_route.gen';
import { BulkGetRulesSourcesRequestBody } from '../../../../../../../common/api/detection_engine/rule_management/bulk_get_sources/bulk_get_sources_route.gen';
import type { RuleAlertType } from '../../../../rule_schema';
import {
  DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import type { PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import { findRules } from '../../../logic/search/find_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { buildSiemResponse } from '../../../../routes/utils';

const MAX_RULES_TO_PROCESS_TOTAL = 10000;

const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  abortSignal,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  abortSignal: AbortSignal;
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    return initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ids,
      executor: async (id: string) => {
        const rule = await readRules({ id, rulesClient, ruleId: undefined });
        if (rule == null) {
          throw Error('Rule not found');
        }
        return rule;
      },
      abortSignal,
    });
  }

  const { data, total } = await findRules({
    rulesClient,
    perPage: MAX_RULES_TO_PROCESS_TOTAL,
    filter: query,
    page: undefined,
    sortField: undefined,
    sortOrder: undefined,
    fields: undefined,
  });

  if (total > MAX_RULES_TO_PROCESS_TOTAL) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    results: data.map((rule) => ({ item: rule.id, result: rule })),
    errors: [],
  };
};

export const performBulkGetRulesSourcesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_BULK_GET_SOURCES,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(BulkGetRulesSourcesRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<BulkGetRulesSourcesResponse>> => {
        const { body } = request;
        const siemResponse = buildSiemResponse(response);

        if (body?.ids && body.ids.length > RULES_TABLE_MAX_PAGE_SIZE) {
          return siemResponse.error({
            body: `More than ${RULES_TABLE_MAX_PAGE_SIZE} ids sent for bulk get sources.`,
            statusCode: 400,
          });
        }

        if (body?.ids && body.query !== undefined) {
          return siemResponse.error({
            body: `Both query and ids are sent. Define either ids or query in request payload.`,
            statusCode: 400,
          });
        }

        const abortController = new AbortController();

        // subscribing to completed$, because it handles both cases when request was completed and aborted.
        // when route is finished by timeout, aborted$ is not getting fired
        request.events.completed$.subscribe(() => abortController.abort());
        try {
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);

          const rulesClient = ctx.alerting.getRulesClient();

          const query = body.query !== '' ? body.query : undefined;

          const fetchRulesOutcome = await fetchRulesByQueryOrIds({
            rulesClient,
            query,
            ids: body.ids,
            abortSignal: abortController.signal,
          });

          const rules = fetchRulesOutcome.results.map(({ result }) => result);
          const indexPatterns: string[] = [];
          const dataViewIds: string[] = [];
          rules.forEach((rule) => {
            const dataViewId = (rule.params as { dataViewId?: string }).dataViewId;
            const index = (rule.params as { index?: string[] }).index;
            if (dataViewId) {
              dataViewIds.push(dataViewId);
            } else if (index) {
              indexPatterns.push(...index);
            }
          });

          if (abortController.signal.aborted === true) {
            throw new AbortError('Bulk get sources request was aborted');
          }

          const responseBody: BulkGetRulesSourcesResponse = {
            indexPatterns: [...new Set(indexPatterns)],
            dataViewIds,
          };

          return response.ok({ body: responseBody });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
