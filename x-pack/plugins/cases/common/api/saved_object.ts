/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { either } from 'fp-ts/lib/Either';

export const NumberFromString = new rt.Type<number, string, unknown>(
  'NumberFromString',
  rt.number.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (s) => {
      const n = +s;
      return isNaN(n) ? rt.failure(u, c, 'cannot parse to a number') : rt.success(n);
    }),
  String
);

const ReferenceRt = rt.type({ id: rt.string, type: rt.string });

export const SavedObjectFindOptionsRt = rt.partial({
  /**
   * The default operator to use for the simple_query_string
   */
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  /**
   * The operator for controlling the logic of the `hasReference` field
   */
  hasReferenceOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  /**
   * Filter by objects that have an association to another object
   */
  hasReference: rt.union([rt.array(ReferenceRt), ReferenceRt]),
  /**
   * The fields to return in the attributes key of the response
   */
  fields: rt.array(rt.string),
  /**
   * The filter is a KQL string with the caveat that if you filter with an attribute from your saved object type, it should look like that: savedObjectType.attributes.title: "myTitle". However, If you use a root attribute of a saved object such as updated_at, you will have to define your filter like that: savedObjectType.updated_at > 2018-12-22
   */
  filter: rt.string,
  /**
   * The page of objects to return
   */
  page: NumberFromString,
  /**
   * The number of objects to return for a page
   */
  perPage: NumberFromString,
  /**
   * An Elasticsearch simple_query_string query that filters the objects in the response
   */
  search: rt.string,
  /**
   * The fields to perform the simple_query_string parsed query against
   */
  searchFields: rt.array(rt.string),
  /**
   * Sorts the response. Includes "root" and "type" fields. "root" fields exist for all saved objects, such as "updated_at". "type" fields are specific to an object type, such as fields returned in the attributes key of the response. When a single type is defined in the type parameter, the "root" and "type" fields are allowed, and validity checks are made in that order. When multiple types are defined in the type parameter, only "root" fields are allowed
   */
  sortField: rt.string,
  /**
   * Order to sort the response
   */
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

export type SavedObjectFindOptions = rt.TypeOf<typeof SavedObjectFindOptionsRt>;
