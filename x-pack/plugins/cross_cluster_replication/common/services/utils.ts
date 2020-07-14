/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const arrify = (val: any): any[] => (Array.isArray(val) ? val : [val]);

/**
 * Utilty to add some latency in a Promise chain
 *
 * @param {number} time Time in millisecond to wait
 */
export const wait = (time = 1000) => (data: any): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), time);
  });
};

/**
 * Utility to remove empty fields ("") from a request body
 */
export const removeEmptyFields = (body: Record<string, any>): Record<string, any> =>
  Object.entries(body).reduce((acc: Record<string, any>, [key, value]: [string, any]): Record<
    string,
    any
  > => {
    if (value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
