/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { createPromiseFromStreams } from '@kbn/utils';
import { chunk } from 'lodash/fp';
import { extname } from 'path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { RuleToImport } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  ImportRulesRequestQuery,
  ImportRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { HapiReadableStream, SecuritySolutionPluginRouter } from '../../../../../../types';
import type { BulkError, ImportRuleResponse } from '../../../../routes/utils';
import { buildSiemResponse, isBulkError, isImportRegular } from '../../../../routes/utils';
import { importRuleActionConnectors } from '../../../logic/import/action_connectors/import_rule_action_connectors';
import { createRulesAndExceptionsStreamFromNdJson } from '../../../logic/import/create_rules_stream_from_ndjson';
import type { RuleExceptionsPromiseFromStreams } from '../../../logic/import/import_rules_utils';
import { importRules as importRulesHelper } from '../../../logic/import/import_rules_utils';
import { importRuleExceptions } from '../../../logic/import/import_rule_exceptions';
import {
  getTupleDuplicateErrorsAndUniqueRules,
  migrateLegacyActionsIds,
} from '../../../utils/utils';
import { RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS } from '../../timeouts';

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importRulesRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.versioned
    .post({
      access: 'public',
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
        timeout: {
          idleSocket: RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ImportRulesRequestQuery),
            body: schema.any(), // validation on file object is accomplished later in the handler.
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ImportRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'alerting',
            'actions',
            'lists',
            'licensing',
          ]);

          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const actionsClient = ctx.actions.getActionsClient();
          const actionSOClient = ctx.core.savedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const actionsImporter = ctx.core.savedObjects.getImporter(actionSOClient);

          const savedObjectsClient = ctx.core.savedObjects.client;
          const exceptionsClient = ctx.lists?.getExceptionListClient();

          const { filename } = (request.body.file as HapiReadableStream).hapi;
          const fileExtension = extname(filename).toLowerCase();
          if (fileExtension !== '.ndjson') {
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid file extension ${fileExtension}`,
            });
          }

          const objectLimit = config.maxRuleImportExportSize;

          // parse file to separate out exceptions from rules
          const readAllStream = createRulesAndExceptionsStreamFromNdJson(objectLimit);
          const [{ exceptions, rules, actionConnectors }] = await createPromiseFromStreams<
            RuleExceptionsPromiseFromStreams[]
          >([request.body.file as HapiReadableStream, ...readAllStream]);

          // import exceptions, includes validation
          const {
            errors: exceptionsErrors,
            successCount: exceptionsSuccessCount,
            success: exceptionsSuccess,
          } = await importRuleExceptions({
            exceptions,
            exceptionsClient,
            overwrite: request.query.overwrite_exceptions,
            maxExceptionsImportSize: objectLimit,
          });
          // report on duplicate rules
          const [duplicateIdErrors, parsedObjectsWithoutDuplicateErrors] =
            getTupleDuplicateErrorsAndUniqueRules(rules, request.query.overwrite);

          // import actions-connectors
          const {
            successCount: actionConnectorSuccessCount,
            success: actionConnectorSuccess,
            warnings: actionConnectorWarnings,
            errors: actionConnectorErrors,
          } = await importRuleActionConnectors({
            actionConnectors,
            actionsClient,
            actionsImporter,
            overwrite: request.query.overwrite_action_connectors,
          });

          const migratedParsedObjectsWithoutDuplicateErrors = await migrateLegacyActionsIds(
            parsedObjectsWithoutDuplicateErrors,
            actionSOClient,
            actionsClient
          );

          const rulesToImport = migratedParsedObjectsWithoutDuplicateErrors.filter(
            (ruleOrError) => !(ruleOrError instanceof Error)
          ) as RuleToImport[];

          // After importing the actions and migrating action IDs on rules to import,
          // validate that all actions referenced by rules exist
          // Filter out rules that reference non-existent actions
          const missingActionErrors: BulkError[] = [];
          const allActions = await actionsClient.getAll();
          const validatedActionRules = rulesToImport.filter((rule) => {
            if (rule.actions == null || rule.actions.length === 0) {
              return true;
            }

            const missingActions = rule.actions.filter(
              (action) => !allActions.some((installedAction) => action.id === installedAction.id)
            );

            if (missingActions.length > 0) {
              missingActionErrors.push({
                id: rule.id,
                rule_id: rule.rule_id,
                error: {
                  status_code: 404,
                  message: `Rule actions reference the following missing action IDs: ${missingActions
                    .map((action) => action.id)
                    .join(',')}`,
                },
              });
              return false;
            }
            return true;
          });

          const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, validatedActionRules);

          const importRuleResponse: ImportRuleResponse[] = await importRulesHelper({
            ruleChunks: chunkParseObjects,
            rulesResponseAcc: [...actionConnectorErrors, ...duplicateIdErrors],
            overwriteRules: request.query.overwrite,
            detectionRulesClient,
            allowMissingConnectorSecrets: !!actionConnectors.length,
            savedObjectsClient,
          });

          const errorsResp = importRuleResponse.filter((resp) => isBulkError(resp)) as BulkError[];
          const successes = importRuleResponse.filter((resp) => {
            if (isImportRegular(resp)) {
              return resp.status_code === 200;
            } else {
              return false;
            }
          });
          const importRules: ImportRulesResponse = {
            success: errorsResp.length === 0,
            success_count: successes.length,
            rules_count: rules.length,
            errors: errorsResp,
            exceptions_errors: exceptionsErrors,
            exceptions_success: exceptionsSuccess,
            exceptions_success_count: exceptionsSuccessCount,
            action_connectors_success: actionConnectorSuccess,
            action_connectors_success_count: actionConnectorSuccessCount,
            action_connectors_errors: actionConnectorErrors,
            action_connectors_warnings: actionConnectorWarnings,
          };

          return response.ok({ body: ImportRulesResponse.parse(importRules) });
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
