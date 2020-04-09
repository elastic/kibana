/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export const flattenObject = (nestedObj, flattenArrays) => {
  const stack = []; // track key stack
  const flatObj = {};
  const dot = '.';
  (function flattenObj(obj) {
    _.keys(obj).forEach(function(key) {
      stack.push(key);
      if (!flattenArrays && Array.isArray(obj[key])) flatObj[stack.join(dot)] = obj[key];
      else if (_.isObject(obj[key])) flattenObj(obj[key]);
      else flatObj[stack.join(dot)] = obj[key];
      stack.pop();
    });
  })(nestedObj);
  return flatObj;
};
