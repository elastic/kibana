/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CspBenchmarkRulesBulkActionRequestSchema,
  CspBenchmarkRulesStates,
  cspBenchmarkRulesBulkActionRequestSchema,
} from '../../../../common/types/rules/v3';
import { CspRouter } from '../../../types';

import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../../common/constants';
import { bulkActionBenchmarkRulesHandler } from './v1';

/**
	This API allows bulk actions (mute or unmute) on CSP benchmark rules.
	Request:
	{
	  action: 'mute' | 'unmute'; // Specify the bulk action type (mute or unmute)
	  rules: [
	    {
        benchmark_id: string;       // Identifier for the CSP benchmark
	      benchmark_version: string;  // Version of the CSP benchmark
	      rule_number: string;        // Rule number within the benchmark
	      rule_id: string;            // Unique identifier for the rule
	    },
	    // ... (additional benchmark rules)
	  ];
	}
	
	Response:
	{
	  updated_benchmark_rules: CspBenchmarkRulesStates; Benchmark rules object that were affected
	  detection_rules: string;         // Status message indicating the number of detection rules affected
	  message: string;                 // Success message
	}
	*/
export const defineBulkActionCspBenchmarkRulesRoute = (router: CspRouter) =>
  router.versioned
    .post({
      access: 'internal',
      path: CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
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

          const benchmarkRulesToUpdate = requestBody.rules;

          const detectionRulesClient = (await context.alerting).getRulesClient();

          const handlerResponse = await bulkActionBenchmarkRulesHandler(
            cspContext.soClient,
            cspContext.encryptedSavedObjects,
            detectionRulesClient,
            benchmarkRulesToUpdate,
            requestBody.action,
            cspContext.logger
          );

          const updatedBenchmarkRules: CspBenchmarkRulesStates =
            handlerResponse.newCspSettings.attributes.rules!;

          return response.ok({
            body: {
              updated_benchmark_rules: updatedBenchmarkRules,
              detection_rules: `disabled ${handlerResponse.disabledRulesCounter} detections rules.`,
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
