/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_VALIDATE_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
  ValidationIndicesError,
} from '../../../../common/http_api';

import { throwErrors } from '../../../../common/runtime_types';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initValidateLogAnalysisIndicesRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_VALIDATE_INDICES_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          validationIndicesRequestPayloadRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { fields, indices } = payload.data;
        const errors: ValidationIndicesError[] = [];

        // Query each pattern individually, to map correctly the errors
        await Promise.all(
          indices.map(async (index) => {
            const fieldCaps = await framework.callWithRequest(requestContext, 'fieldCaps', {
              allow_no_indices: true,
              fields: fields.map((field) => field.name),
              ignore_unavailable: true,
              index,
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
          body: validationIndicesResponsePayloadRT.encode({ data: { errors } }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
