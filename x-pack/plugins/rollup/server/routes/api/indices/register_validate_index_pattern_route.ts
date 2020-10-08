/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

type NumericField =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'scaled_float'
  | 'double'
  | 'float'
  | 'half_float';

interface FieldCapability {
  date?: any;
  keyword?: any;
  long?: any;
  integer?: any;
  short?: any;
  byte?: any;
  double?: any;
  float?: any;
  half_float?: any;
  scaled_float?: any;
}

interface FieldCapabilities {
  fields: FieldCapability[];
}

function isNumericField(fieldCapability: FieldCapability) {
  const numericTypes = [
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'scaled_float',
  ];
  return numericTypes.some((numericType) => fieldCapability[numericType as NumericField] != null);
}

/**
 * Returns information on validity of an index pattern for creating a rollup job:
 *  - Does the index pattern match any indices?
 *  - Does the index pattern match rollup indices?
 *  - Which date fields, numeric fields, and keyword fields are available in the matching indices?
 */
export const registerValidateIndexPatternRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/index_pattern_validity/{indexPattern}'),
      validate: {
        params: schema.object({
          indexPattern: schema.string(),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const { indexPattern } = request.params;
        const [fieldCapabilities, rollupIndexCapabilities]: [
          FieldCapabilities,
          { [key: string]: any }
        ] = await Promise.all([
          context.rollup!.client.callAsCurrentUser('rollup.fieldCapabilities', { indexPattern }),
          context.rollup!.client.callAsCurrentUser('rollup.rollupIndexCapabilities', {
            indexPattern,
          }),
        ]);

        const doesMatchIndices = Object.entries(fieldCapabilities.fields).length !== 0;
        const doesMatchRollupIndices = Object.entries(rollupIndexCapabilities).length !== 0;

        const dateFields: string[] = [];
        const numericFields: string[] = [];
        const keywordFields: string[] = [];

        const fieldCapabilitiesEntries = Object.entries(fieldCapabilities.fields);

        fieldCapabilitiesEntries.forEach(
          ([fieldName, fieldCapability]: [string, FieldCapability]) => {
            if (fieldCapability.date) {
              dateFields.push(fieldName);
              return;
            }

            if (isNumericField(fieldCapability)) {
              numericFields.push(fieldName);
              return;
            }

            if (fieldCapability.keyword) {
              keywordFields.push(fieldName);
            }
          }
        );

        const body = {
          doesMatchIndices,
          doesMatchRollupIndices,
          dateFields,
          numericFields,
          keywordFields,
        };

        return response.ok({ body });
      } catch (err) {
        // 404s are still valid results.
        if (err.statusCode === 404) {
          const notFoundBody = {
            doesMatchIndices: false,
            doesMatchRollupIndices: false,
            dateFields: [],
            numericFields: [],
            keywordFields: [],
          };
          return response.ok({ body: notFoundBody });
        }

        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }

        return response.internalError({ body: err });
      }
    })
  );
};
