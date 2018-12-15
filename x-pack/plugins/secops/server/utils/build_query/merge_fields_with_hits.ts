/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, merge } from 'lodash/fp';

export const mergeFieldsWithHit = (
  fieldName: string,
  propertyName: string,
  flattenedFields: Record<string, {}>,
  fieldMap: Readonly<Record<string, string>>,
  hit: { _source: {} }
) => {
  if (fieldMap[fieldName] != null) {
    const esField = fieldMap[fieldName];
    if (has(esField, hit._source)) {
      const objectWithProperty = {
        [propertyName]: {
          ...flattenedFields[propertyName],
          ...fieldName
            .split('.')
            .reduceRight((obj, next) => ({ [next]: obj }), get(esField, hit._source)),
        },
      };
      return merge(flattenedFields, objectWithProperty);
    } else {
      return flattenedFields;
    }
  } else {
    return flattenedFields;
  }
};
