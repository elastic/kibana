/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import {
  CheckIndexPatternResponse,
  CheckIndexPatternFieldsResponse,
  CheckIndexPatternFieldResponse,
} from '../../../../common/types';
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
  fields: Record<string, FieldCapability>;
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

function determineFieldType(fieldCap: FieldCapability): CheckIndexPatternFieldResponse['type'] {
  if (!fieldCap) {
    return 'unknown';
  }
  if (fieldCap.date) {
    return 'date';
  }
  if (isNumericField(fieldCap)) {
    return 'numeric';
  }
  if (fieldCap.keyword) {
    return 'keyword';
  }
  return 'unknown';
}

/**
 * Returns information on validity of an index pattern to support creating a rollup action:
 *  - Does the index pattern match any indices?
 *  - Which date fields, numeric fields, and keyword fields are available in the matching indices?
 */
export const registerValidateIndexPatternRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/index_pattern_validity/{indexPattern}'),
      validate: {
        params: schema.object({
          indexPattern: schema.string(),
          fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const { indexPattern, fields } = request.params;

        const {
          body: fieldCapabilities,
        } = await context.core.elasticsearch.client.asCurrentUser.fieldCaps<FieldCapabilities>({
          index: indexPattern,
          fields: fields ?? '*',
        });

        const doesMatchIndices = Object.entries(fieldCapabilities.fields).length !== 0;

        const responseFields: CheckIndexPatternFieldsResponse = [];

        const fieldCapabilitiesEntries = Object.entries(fieldCapabilities.fields);
        fieldCapabilitiesEntries.forEach(
          ([fieldName, fieldCapability]: [string, FieldCapability]) => {
            const type = determineFieldType(fieldCapability);
            if (type !== 'unknown') {
              responseFields.push({ name: fieldName, type });
            }
          }
        );

        const body: CheckIndexPatternResponse = {
          doesMatchIndices,
          fields: responseFields,
        };

        return response.ok({ body });
      } catch (error) {
        // 404s are still valid results.
        if (error.statusCode === 404) {
          const notFoundBody: CheckIndexPatternResponse = {
            doesMatchIndices: false,
            fields: [],
          };
          return response.ok({ body: notFoundBody });
        }

        return handleEsError({ error, response });
      }
    })
  );
};
