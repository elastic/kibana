/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { extname } from 'path';
import { schema } from '@kbn/config-schema';
import { createPromiseFromStreams } from '@kbn/utils';

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { ImportQuerySchemaDecoded } from '@kbn/securitysolution-io-ts-types';
import { importQuerySchema } from '@kbn/securitysolution-io-ts-types';

import type { ImportRulesSchema as ImportRulesResponseSchema } from '../../../../../../../common/detection_engine/schemas/response/import_rules_schema';
import { importRulesSchema as importRulesResponseSchema } from '../../../../../../../common/detection_engine/schemas/response/import_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { SetupPlugins } from '../../../../../../plugin';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import type { ImportRuleResponse, BulkError } from '../../../../routes/utils';
import { isBulkError, isImportRegular, buildSiemResponse } from '../../../../routes/utils';

import {
  getTupleDuplicateErrorsAndUniqueRules,
  getInvalidConnectors,
  migrateLegacyActionsIds,
} from '../../../utils/utils';
import { createRulesAndExceptionsStreamFromNdJson } from '../../../logic/import/create_rules_stream_from_ndjson';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import type { RuleExceptionsPromiseFromStreams } from '../../../logic/import/import_rules_utils';
import { importRules as importRulesHelper } from '../../../logic/import/import_rules_utils';
import { getReferencedExceptionLists } from '../../../logic/import/gather_referenced_exceptions';
import { importRuleExceptions } from '../../../logic/import/import_rule_exceptions';
import type { ImportRulesSchema } from '../../../../../../../common/detection_engine/schemas/request/import_rules_schema';
import type { HapiReadableStream } from '../../../logic/import/hapi_readable_stream';

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml']
) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      validate: {
        query: buildRouteValidation<typeof importQuerySchema, ImportQuerySchemaDecoded>(
          importQuerySchema
        ),
        body: schema.any(), // validation on file object is accomplished later in the handler.
      },
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
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

        const rulesClient = ctx.alerting.getRulesClient();
        const actionsClient = ctx.actions.getActionsClient();
        const actionSOClient = ctx.core.savedObjects.getClient({
          includedHiddenTypes: ['action'],
        });
        const savedObjectsClient = ctx.core.savedObjects.client;
        const exceptionsClient = ctx.lists?.getExceptionListClient();

        const mlAuthz = buildMlAuthz({
          license: ctx.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

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
        const [{ exceptions, rules }] = await createPromiseFromStreams<
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
          actionSOClient
        );

        let parsedRules;
        let actionErrors: BulkError[] = [];
        const actualRules = rules.filter(
          (rule): rule is ImportRulesSchema => !(rule instanceof Error)
        );

        if (actualRules.some((rule) => rule.actions && rule.actions.length > 0)) {
          const [nonExistentActionErrors, uniqueParsedObjects] = await getInvalidConnectors(
            migratedParsedObjectsWithoutDuplicateErrors,
            actionsClient
          );
          parsedRules = uniqueParsedObjects;
          actionErrors = nonExistentActionErrors;
        } else {
          parsedRules = migratedParsedObjectsWithoutDuplicateErrors;
        }
        // gather all exception lists that the imported rules reference
        const foundReferencedExceptionLists = await getReferencedExceptionLists({
          rules: parsedRules,
          savedObjectsClient,
        });

        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, parsedRules);

        const importRuleResponse: ImportRuleResponse[] = await importRulesHelper({
          ruleChunks: chunkParseObjects,
          rulesResponseAcc: [...actionErrors, ...duplicateIdErrors],
          mlAuthz,
          overwriteRules: request.query.overwrite,
          rulesClient,
          savedObjectsClient,
          exceptionsClient,
          spaceId: ctx.securitySolution.getSpaceId(),
          existingLists: foundReferencedExceptionLists,
        });

        const errorsResp = importRuleResponse.filter((resp) => isBulkError(resp)) as BulkError[];
        const successes = importRuleResponse.filter((resp) => {
          if (isImportRegular(resp)) {
            return resp.status_code === 200;
          } else {
            return false;
          }
        });
        const importRules: ImportRulesResponseSchema = {
          success: errorsResp.length === 0,
          success_count: successes.length,
          rules_count: rules.length,
          errors: errorsResp,
          exceptions_errors: exceptionsErrors,
          exceptions_success: exceptionsSuccess,
          exceptions_success_count: exceptionsSuccessCount,
        };

        const [validated, errors] = validate(importRules, importRulesResponseSchema);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
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
