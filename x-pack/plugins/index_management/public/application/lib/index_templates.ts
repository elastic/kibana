/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { parse } from 'query-string';
import { Location } from 'history';

export const getFormatVersionFromQueryparams = (location: Location): 1 | 2 | undefined => {
  const { v } = parse(location.search.substring(1));

  if (!Boolean(v) || typeof v !== 'string') {
    return undefined;
  }

  return +v as 1 | 2;
};
