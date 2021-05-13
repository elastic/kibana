/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeMapping } from '@elastic/elasticsearch/api/types';
import { set } from '@elastic/safer-lodash-set';
import { FieldMap } from './field_map/types';

export function mappingFromFieldMap(fieldMap: FieldMap): TypeMapping {
  const mappings = {
    dynamic: 'strict' as const,
    properties: {},
  };

  const fields = Object.keys(fieldMap).map((key) => {
    const field = fieldMap[key];
    return {
      name: key,
      ...field,
    };
  });

  fields.forEach((field) => {
    const { name, required, array, ...rest } = field;

    set(mappings.properties, field.name.split('.').join('.properties.'), rest);
  });

  return mappings;
}
