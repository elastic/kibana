/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface SearchFilter {
  field: string;
  type: 'keyword' | 'date' | 'boolean';
  description: string;
  values?: string[];
}

export const generateSearchSchema = ({ filters }: { filters: SearchFilter[] }) => {
  return filters.reduce<Record<string, z.ZodType>>(
    (schema, filter) => {
      return {
        ...schema,
        ...generateFilterSchema({ filter }),
      };
    },
    {
      query: z.string().describe('A query to use for fulltext search').optional(),
    }
  );
};

export const generateFilterSchema = ({
  filter,
}: {
  filter: SearchFilter;
}): Record<string, z.ZodType> => {
  switch (filter.type) {
    case 'keyword':
      if (filter.values && filter.values.length > 0) {
        return {
          [filter.field]: z
            .enum(filter.values as [string, ...string[]])
            .describe(filter.description)
            .optional(),
        };
      } else {
        return {
          [filter.field]: z.string().describe(filter.description).optional(),
        };
      }
    case 'date':
      return {
        [filter.field]: z
          .string()
          .datetime({ offset: true })
          .describe(`${filter.description} - use ISO 8601 format`)
          .optional(),
      };
    case 'boolean':
      return { [filter.field]: z.boolean().describe(filter.description).optional() };
    default:
      return {};
  }
};
