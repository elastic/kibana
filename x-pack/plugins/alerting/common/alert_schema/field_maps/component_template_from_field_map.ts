/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { mappingFromFieldMap } from './mapping_from_field_map';
import { FieldMap } from './types';

export interface GetComponentTemplateFromFieldMapOpts {
  name: string;
  fieldLimit?: number;
  fieldMap: FieldMap;
}
export const getComponentTemplateFromFieldMap = ({
  name,
  fieldMap,
  fieldLimit,
}: GetComponentTemplateFromFieldMapOpts): ClusterPutComponentTemplateRequest => {
  return {
    name,
    _meta: {
      managed: true,
    },
    template: {
      settings: {
        number_of_shards: 1,
        'index.mapping.total_fields.limit': fieldLimit ?? 1000,
      },
      mappings: mappingFromFieldMap(fieldMap, 'strict'),
    },
  };
};
