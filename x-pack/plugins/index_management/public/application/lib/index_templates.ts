/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { parse } from 'query-string';
import { Location } from 'history';

export const getFormatVersionFromQueryparams = (location: Location): 1 | 2 | undefined => {
  const { v: version } = parse(location.search.substring(1));

  if (!Boolean(version) || typeof version !== 'string') {
    return undefined;
  }

  return +version as 1 | 2;
};
