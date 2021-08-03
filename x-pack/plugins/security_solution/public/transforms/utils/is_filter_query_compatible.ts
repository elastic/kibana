/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import { ESQuery } from '../../../common/typed_json';

/**
 * Array of query compatible objects which are at the moment all
 * simple empty or match all based objects
 */
const queryCompatibleStrings: ESQuery[] = [
  {
    bool: {
      must: [],
      filter: [{ match_all: {} }],
      should: [],
      must_not: [],
    },
  },
  {
    bool: {
      must: [],
      filter: [],
      should: [],
      must_not: [],
    },
  },
];

/**
 * Returns true if the filter query matches against one of the compatible strings, otherwise
 * false. Right now we only check if the filter query is empty, or a match all in order to activate
 * the transform.
 * @param filterQuery The filterQuery to check against and return true if it matches, otherwise false.
 * @returns true if the filter is compatible, otherwise false.
 */
export const isFilterQueryCompatible = (filterQuery: ESQuery | string | undefined): boolean => {
  if (filterQuery === undefined) {
    return true;
  } else if (typeof filterQuery === 'string') {
    try {
      const filterQueryObject = JSON.parse(filterQuery);
      return queryCompatibleStrings.some((entry) => isEqual(entry, filterQueryObject));
    } catch (error) {
      return false;
    }
  } else {
    return queryCompatibleStrings.some((entry) => isEqual(entry, filterQuery));
  }
};
