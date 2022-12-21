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

import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { ImportQuerySchemaDecoded, importQuerySchema } from '@kbn/securitysolution-io-ts-types';

import {
  ImportRulesSchema as ImportRulesResponseSchema,
  importRulesSchema as importRulesResponseSchema,
} from '../../../../../common/detection_engine/schemas/response/import_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  ImportRuleResponse,
  BulkError,
  isBulkError,
  isImportRegular,
  buildSiemResponse,
} from '../utils';

import {
  getTupleDuplicateErrorsAndUniqueRules,
  getInvalidConnectors,
  migrateLegacyActionsIds,
} from './utils';
import { createRulesAndExceptionsStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { HapiReadableStream } from '../../rules/types';
import {
  importRules as importRulesHelper,
  RuleExceptionsPromiseFromStreams,
} from './utils/import_rules_utils';
import { getReferencedExceptionLists } from './utils/gather_referenced_exceptions';
import { importRuleExceptions } from './utils/import_rule_exceptions';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request';

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
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
        const rulesClient = context.alerting.getRulesClient();
        const actionsClient = context.actions.getActionsClient();
        const esClient = context.core.elasticsearch.client;
        const actionSOClient = context.core.savedObjects.getClient({
          includedHiddenTypes: ['action'],
        });
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution.getAppClient();
        const exceptionsClient = context.lists?.getExceptionListClient();

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
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

        const signalsIndex = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(esClient.asCurrentUser, signalsIndex);
        if (!isRuleRegistryEnabled && !indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${signalsIndex} does not exist`,
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
          (rule): rule is ImportRulesSchemaDecoded => !(rule instanceof Error)
        );

        if (actualRules.some((rule) => rule.actions.length > 0)) {
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
          isRuleRegistryEnabled,
          spaceId: context.securitySolution.getSpaceId(),
          signalsIndex,
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
