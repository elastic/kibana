/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const OperatorSchema = z.enum(['AND', 'OR']);
const ReferenceSchema = z.strictObject({
  id: z.string(),
  type: z.string(),
});

const transformStringToNumber = (val: string, ctx: z.RefinementCtx) => {
  const asNumber = parseInt(val, 10);

  if (isNaN(asNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'cannot parse to a number',
    });

    return z.NEVER;
  }

  return asNumber;
};

export const SavedObjectFindOptionsSchema = z.strictObject({
  /**
   * The default operator to use for the simple_query_string
   */
  defaultSearchOperator: OperatorSchema,
  /**
   * The operator for controlling the logic of the `hasReference` field
   */
  hasReferenceOperator: OperatorSchema,
  /**
   * Filter by objects that have an association to another object
   */
  hasReference: z.union([z.array(ReferenceSchema), ReferenceSchema]),
  /**
   * The fields to return in the attributes key of the response
   */
  fields: z.array(z.string()),
  /**
   * The filter is a KQL string with the caveat that if you filter with an attribute from your saved object type, it should look like that: savedObjectType.attributes.title: "myTitle". However, If you use a root attribute of a saved object such as updated_at, you will have to define your filter like that: savedObjectType.updated_at > 2018-12-22
   */
  filter: z.string(),
  /**
   * The page of objects to return
   */
  page: z.string().transform(transformStringToNumber),
  /**
   * The number of objects to return for a page
   */
  perPage: z.string().transform(transformStringToNumber),
  /**
   * An Elasticsearch simple_query_string query that filters the objects in the response
   */
  search: z.string(),
  /**
   * The fields to perform the simple_query_string parsed query against
   */
  searchField: z.array(z.string()),
  /**
   * Sorts the response. Includes "root" and "type" fields. "root" fields exist for all saved objects, such as "updated_at". "type" fields are specific to an object type, such as fields returned in the attributes key of the response. When a single type is defined in the type parameter, the "root" and "type" fields are allowed, and validity checks are made in that order. When multiple types are defined in the type parameter, only "root" fields are allowed
   */
  sortField: z.string(),
  /**
   * Order to sort the response
   */
  sortOrder: z.enum(['desc', 'asc']),
});

export type SavedObjectFindOptions = z.infer<typeof SavedObjectFindOptionsSchema>;
