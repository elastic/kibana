/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../../lib/infra_types';

import { throwErrors } from '../../../../common/runtime_types';
import { logAnalysisValidationV1 } from '../../../../common/http_api';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initValidateLogAnalysisIndicesRoute = ({ framework }: InfraBackendLibs) => {
  if (!framework.config.featureFlags.logsUIEnabled) {
    return;
  }

  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAnalysisValidationV1.LOG_ANALYSIS_VALIDATE_INDICES_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: escapeHatch } },
      },
      async (requestContext, request, response) => {
        const payload = pipe(
          logAnalysisValidationV1.validationIndicesRequestPayloadRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { fields, indices, runtimeMappings } = payload.data;
        const errors: logAnalysisValidationV1.ValidationIndicesError[] = [];

        // Query each pattern individually, to map correctly the errors
        await Promise.all(
          indices.map(async (index) => {
            const fieldCaps = await (
              await requestContext.core
            ).elasticsearch.client.asCurrentUser.fieldCaps({
              allow_no_indices: true,
              fields: fields.map((field) => field.name),
              ignore_unavailable: true,
              index,
              body: {
                runtime_mappings: runtimeMappings,
              },
            });

            if (fieldCaps.indices.length === 0) {
              errors.push({
                error: 'INDEX_NOT_FOUND',
                index,
              });
              return;
            }

            fields.forEach(({ name: fieldName, validTypes }) => {
              const fieldMetadata = fieldCaps.fields[fieldName];

              if (fieldMetadata === undefined) {
                errors.push({
                  error: 'FIELD_NOT_FOUND',
                  index,
                  field: fieldName,
                });
              } else {
                const fieldTypes = Object.keys(fieldMetadata);

                if (!fieldTypes.every((fieldType) => validTypes.includes(fieldType))) {
                  errors.push({
                    error: `FIELD_NOT_VALID`,
                    index,
                    field: fieldName,
                  });
                }
              }
            });
          })
        );

        return response.ok({
          body: logAnalysisValidationV1.validationIndicesResponsePayloadRT.encode({
            data: { errors },
          }),
        });
      }
    );
};
