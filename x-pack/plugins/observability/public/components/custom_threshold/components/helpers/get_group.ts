/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Group } from '../types';

export const getGroupQueries = (groups?: Group[], fieldName?: string): QueryDslQueryContainer[] => {
  return (
    (groups &&
      groups.map((group) => ({
        term: {
          [fieldName || group.field]: {
            value: group.value,
          },
        },
      }))) ||
    []
  );
};

export const getGroupFilters = (groups?: Group[], fieldName?: string): Filter[] => {
  return getGroupQueries(groups, fieldName).map((query) => ({ meta: {}, query }));
};
