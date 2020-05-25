/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { includes } from 'lodash';
import { getType } from '@kbn/interpreter/common';

/*

  IMPORTANT: These only work with simple values, eg string, number, boolean.
  Getting or setting anything else will throw.

*/

// TODO: With the removal of objectified literals in the AST I don't think we need this anymore.

const allowedTypes = ['string', 'number', 'boolean'];
const badType = () => new Error(`Arg setting helpers only support ${allowedTypes.join(',')}`);

const isAllowed = (type) => includes(allowedTypes, type);

export function validateArg(value) {
  const type = getType(value);
  if (!isAllowed(type)) {
    throw badType();
  }
  return value;
}

export function getSimpleArg(name, args) {
  if (!args[name]) {
    return [];
  }
  return args[name].map((astVal) => {
    if (!isAllowed(getType(astVal))) {
      throw badType();
    }
    return astVal;
  });
}

export function setSimpleArg(name, value) {
  value = Array.isArray(value) ? value : [value];
  return { [name]: value.map(validateArg) };
}
