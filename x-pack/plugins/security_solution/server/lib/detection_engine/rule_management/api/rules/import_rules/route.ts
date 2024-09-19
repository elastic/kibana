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
import {
  ImportRulesRequestQuery,
  ImportRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { HapiReadableStream, SecuritySolutionPluginRouter } from '../../../../../../types';
import type { BulkError, ImportRuleResponse } from '../../../../routes/utils';
import { buildSiemResponse, isBulkError, isImportRegular } from '../../../../routes/utils';
import { PrebuiltRulesImportHelper } from '../../../../prebuilt_rules/logic/prebuilt_rules_import_helper';
import { importRuleActionConnectors } from '../../../logic/import/action_connectors/import_rule_action_connectors';
import { importRules } from '../../../logic/import/import_rules_with_source';
import { importRules as legacyImportRules } from '../../../logic/import/import_rules_utils';
import { createRulesAndExceptionsStreamFromNdJson } from '../../../logic/import/create_rules_stream_from_ndjson';
import type { RuleExceptionsPromiseFromStreams } from '../../../logic/import/import_rules_utils';
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

          const { prebuiltRulesCustomizationEnabled } = config.experimentalFeatures;
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

          const migratedParsedObjectsWithoutDuplicateErrors = await migrateLegacyActionsIds(
            parsedObjectsWithoutDuplicateErrors,
            actionSOClient,
            actionsClient
          );

          // import actions-connectors
          const {
            successCount: actionConnectorSuccessCount,
            success: actionConnectorSuccess,
            warnings: actionConnectorWarnings,
            errors: actionConnectorErrors,
            rulesWithMigratedActions,
          } = await importRuleActionConnectors({
            actionConnectors,
            actionsClient,
            actionsImporter,
            rules: migratedParsedObjectsWithoutDuplicateErrors,
            overwrite: request.query.overwrite_action_connectors,
          });

          // rulesWithMigratedActions: Is returned only in case connectors were exported from different namespace and the
          // original rules actions' ids were replaced with new destinationIds
          const parsedRules = actionConnectorErrors.length
            ? []
            : rulesWithMigratedActions || migratedParsedObjectsWithoutDuplicateErrors;

          const prebuiltRulesImportHelper = new PrebuiltRulesImportHelper({
            config,
            context: ctx.securitySolution,
            savedObjectsClient,
          });

          const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, parsedRules);

          let importRuleResponse: ImportRuleResponse[] = [];

          if (prebuiltRulesCustomizationEnabled) {
            importRuleResponse = await importRules({
              ruleChunks: chunkParseObjects,
              rulesResponseAcc: [...actionConnectorErrors, ...duplicateIdErrors],
              overwriteRules: request.query.overwrite,
              allowMissingConnectorSecrets: !!actionConnectors.length,
              prebuiltRulesImportHelper,
              detectionRulesClient,
              savedObjectsClient,
            });
          } else {
            importRuleResponse = await legacyImportRules({
              ruleChunks: chunkParseObjects,
              rulesResponseAcc: [...actionConnectorErrors, ...duplicateIdErrors],
              overwriteRules: request.query.overwrite,
              allowMissingConnectorSecrets: !!actionConnectors.length,
              detectionRulesClient,
              savedObjectsClient,
            });
          }

          const errorsResp = importRuleResponse.filter((resp) => isBulkError(resp)) as BulkError[];
          const successes = importRuleResponse.filter((resp) => {
            if (isImportRegular(resp)) {
              return resp.status_code === 200;
            } else {
              return false;
            }
          });
          const importedRules: ImportRulesResponse = {
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

          return response.ok({ body: ImportRulesResponse.parse(importedRules) });
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
