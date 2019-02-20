/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/**
 * Utility to generate an array of predefined length that
 * can then be used in a .map() chain
 *
 * @example
 * const myArray = generateArrayOfLength(3).map(() => ({ some: 'object' }));
 *
 * @param {Number} length The length of the Array
 * @returns {Array}
 */
export const generateArrayOfLength = (length) => (
  length
    ? generateArrayOfLength(length - 1).concat('')
    : []
);
