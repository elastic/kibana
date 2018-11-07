/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Convert an Object with key IDs to an Array
 *
 * @example
 *
 * Convert:
 * {
 *   myId: { a: 1, b: 1 },
 *   myId2: { a: 2, b: 2 }
 * }
 *
 * To: [{ a: 1, b: 1 }, { a: 2, b: 2 }]
 *
 * @param {*} obj The object to convert
 * @param {boolean} doAddID Add the Object id under __id prop
 */
export const objToArray = (obj: { [key: string]: any }, doAddID = false): any[] => {
  return Object.keys(obj).map(k => (doAddID ? { ...obj[k], __id: k } : obj[k]));
};
