/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQuery } from '../../../common/typed_json';

export const isFilterQueryCompatible = (filterQuery: ESQuery | string | undefined) => {
  if (filterQuery === undefined) {
    return true;
  } else if (typeof filterQuery === 'string') {
    return (
      filterQuery === '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}'
    );
  } else {
    // TODO: Can we check here and return if it matches a string or other signature?
    return false;
  }
};
