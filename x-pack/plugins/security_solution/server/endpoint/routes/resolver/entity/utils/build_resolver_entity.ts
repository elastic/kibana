/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ExperimentalFeatures } from '../../../../../../common';
import { getFieldAsString, getSupportedSchemas } from './supported_schemas';
import type { ResolverEntityIndex } from '../../../../../../common/endpoint/types';

const toArray = <T>(input: T | T[]) => ([] as T[]).concat(input);

export function resolverEntity(
  hits: Array<estypes.SearchHit<unknown>>,
  experimentalFeatures: ExperimentalFeatures | undefined
) {
  const responseBody: ResolverEntityIndex = [];
  const supportedSchemas = getSupportedSchemas(experimentalFeatures);
  for (const hit of hits) {
    for (const supportedSchema of supportedSchemas) {
      let foundSchema = true;
      // check that the constraint and id fields are defined and that the id field is not an empty string
      const id = getFieldAsString(hit._source, supportedSchema.schema.id);
      for (const constraint of supportedSchema.constraints) {
        const fieldValue = getFieldAsString(hit._source, constraint.field);
        // track that all the constraints are true, if one of them is false then this schema is not valid so mark it
        // that we did not find the schema

        foundSchema =
          foundSchema &&
          toArray(constraint.value).some(
            (constraintValue) => constraintValue.toLowerCase() === fieldValue?.toLowerCase()
          );
      }

      if (foundSchema && id !== undefined && id !== '') {
        responseBody.push({
          name: supportedSchema.name,
          schema: supportedSchema.schema,
          id,
        });
      }
    }
  }

  return responseBody;
}
