/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  cspBenchmarkRulesBulkActionRequestSchema,
} from '../../../../common/types/rules/v3';
import { CspRouter } from '../../../types';
import { buildRuleKey, getCspSettings, setRulesStates, updateRulesStates } from './v1';
import { CSP_BENCHMARK_RULE_BULK_ACTION_ROUTE_PATH } from '../../../../common/constants';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const defineBulkActionCspBenchmarkRulesRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      path: CSP_BENCHMARK_RULE_BULK_ACTION_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: cspBenchmarkRulesBulkActionRequestSchema,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;

        try {
          const requestBody: CspBenchmarkRulesBulkActionRequestSchema = request.body;

          const cspSettings = await getCspSettings(cspContext.soClient, cspContext.logger);

          if (!cspSettings) {
            throw cspContext.logger.error(`Failed to read csp settings`);
          }

          // TODO: create handler function
          const currentRulesStates = cspSettings.rules_states;

          const ruleKeys = requestBody.rules.map((rule) =>
            buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
          );

          const newRulesStates = setRulesStates(
            currentRulesStates,
            ruleKeys,
            muteStatesMap[requestBody.action]
          );

          const newCspSettings = await updateRulesStates(cspContext.soClient, newRulesStates);

          return response.ok({
            body: {
              new_csp_settings: newCspSettings,
              message: 'The bulk operation has been executed successfully.',
            },
          });
        } catch (err) {
          const error = transformError(err);

          cspContext.logger.error(`Bulk action failed: ${error.message}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode || 500, // Default to 500 if no specific status code is provided
          });
        }
      }
    );
