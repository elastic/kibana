/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 *  Retrieves the first element of the given array.
 *
 * @param array the array to retrieve a value from
 * @returns the first element of the array, or undefined if the array is undefined
 */
export const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;
