/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const getUnmappedType = (type: string): MappingRuntimeFieldType => {
  if (type === 'date') {
    return 'date';
  } else if (type === 'number') {
    return 'long';
  } else if (type === 'ip') {
    return 'ip';
  } else if (type === 'boolean') {
    return 'boolean';
  } else {
    return 'keyword';
  }
};
