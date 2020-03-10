/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const metadataIndexGetBodySchema = schema.nullable(
  schema.object({
    paging_properties: schema.nullable(
      schema.arrayOf(
        schema.oneOf([
          /**
           * the number of results to return for this request per page
           */
          schema.object({
            page_size: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
          }),
          /**
           * the zero based page index of the the total number of pages of page size
           */
          schema.object({ page_index: schema.number({ defaultValue: 0, min: 0 }) }),
        ])
      )
    ),
    /**
     * filter to be applied, it could be a kql expression or discrete filter to be implemented
     */
    filter: schema.nullable(schema.oneOf([schema.string()])),
  })
);
