/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const replacement = (match: string, p1: string, p2: string) => {
  const split = p2.split(',');
  const newQuery = split.reduce((accum, item, index) => {
    if (index === 0) {
      return `${p1}: "${item}"`;
    } else {
      return `${accum} or ${p1}: "${item}"`;
    }
  }, '');
  return `(${newQuery})`;
};

export const replaceKqlCommasWithOrUsingRegex = (expression: string) => {
  const myRegexp = /([\w\.\-\[\]]+)\s*:\s*"(([\w\.\-\(\)\[\]]+,[\w\.\-\(\)\[\]]+){1,})"/g;
  return expression.replace(myRegexp, replacement);
};

export const replaceKqlCommasWithOr = (kqlQuery: string): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const appQuery = value;
    if (isRisonObject(appQuery)) {
      if (isRegularString(appQuery.query)) {
        appQuery.query = replaceKqlCommasWithOrUsingRegex(appQuery.query);
        return encode(value);
      }
    }
  }
  return kqlQuery;
};
