/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { RulesInfoResponse } from '../../../../../../../common/detection_engine/rule_management/api/rules/info/response_schema';
import { RULES_INFO_URL } from '../../../../../../../common/detection_engine/rule_management/api/urls';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { findRules } from '../../../logic/search/find_rules';

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

// This is a contrived max limit on the number of tags. In fact it can exceed this number and will be truncated to the hardcoded number.
const EXPECTED_MAX_TAGS = 500;

async function fetchRuleTags(rulesClient: RulesClient): Promise<string[]> {
  const res = await rulesClient.aggregate({
    options: {
      fields: ['tags'],
      filter: undefined,
      maxTags: EXPECTED_MAX_TAGS,
    },
  });

  return res.ruleTags ?? [];
}

export const getRulesInfo = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: RULES_INFO_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      const ctx = await context.resolve(['core', 'alerting']);
      const rulesClient = ctx.alerting.getRulesClient();

      try {
        const [{ prebuilt: prebuiltRulesCount, custom: customRulesCount }, tags] =
          await Promise.all([fetchRulesCount(rulesClient), fetchRuleTags(rulesClient)]);
        const responseBody: RulesInfoResponse = {
          rules_custom_count: customRulesCount,
          rules_prebuilt_installed_count: prebuiltRulesCount,
          tags,
        };
        const [validatedBody, validationError] = validate(responseBody, RulesInfoResponse);

        if (validationError != null) {
          return siemResponse.error({ statusCode: 500, body: validationError });
        } else {
          return response.ok({ body: validatedBody ?? {} });
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
