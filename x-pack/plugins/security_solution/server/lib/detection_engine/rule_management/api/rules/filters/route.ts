/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { IKibanaResponse } from '@kbn/core/server';
import { RULE_MANAGEMENT_API_READ } from '@kbn/security-solution-features/src/constants';
import {
  GetRuleManagementFiltersResponse,
  RULE_MANAGEMENT_FILTERS_URL,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';
import { readTags } from '../../tags/read_tags/read_tags';

interface RulesCount {
  prebuilt: number;
  custom: number;
}

const DEFAULT_FIND_RULES_COUNT_PARAMS = {
  perPage: 0,
  page: 1,
  sortField: undefined,
  sortOrder: undefined,
  fields: undefined,
};

async function fetchRulesCount(rulesClient: RulesClient): Promise<RulesCount> {
  const [prebuiltRules, customRules] = await Promise.all([
    findRules({
      ...DEFAULT_FIND_RULES_COUNT_PARAMS,
      rulesClient,
      filter: 'alert.attributes.params.immutable: true',
    }),
    findRules({
      ...DEFAULT_FIND_RULES_COUNT_PARAMS,
      rulesClient,
      filter: 'alert.attributes.params.immutable: false',
    }),
  ]);

  return {
    prebuilt: prebuiltRules.total,
    custom: customRules.total,
  };
}

export const getRuleManagementFilters = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: RULE_MANAGEMENT_FILTERS_URL,
      options: {
        tags: [`access:${RULE_MANAGEMENT_API_READ}`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, _, response): Promise<IKibanaResponse<GetRuleManagementFiltersResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const ctx = await context.resolve(['alerting']);
        const rulesClient = ctx.alerting.getRulesClient();

        try {
          const [{ prebuilt: prebuiltRulesCount, custom: customRulesCount }, tags] =
            await Promise.all([fetchRulesCount(rulesClient), readTags({ rulesClient })]);
          const responseBody: GetRuleManagementFiltersResponse = {
            rules_summary: {
              custom_count: customRulesCount,
              prebuilt_installed_count: prebuiltRulesCount,
            },
            aggregated_fields: {
              tags,
            },
          };
          const [validatedBody, validationError] = validate(
            responseBody,
            GetRuleManagementFiltersResponse
          );

          if (validationError != null) {
            return siemResponse.error({ statusCode: 500, body: validationError });
          } else {
            return response.ok({ body: validatedBody });
          }
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
