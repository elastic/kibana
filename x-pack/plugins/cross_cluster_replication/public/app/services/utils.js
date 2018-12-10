/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/**
 * Utilty to add some latency in a Promise chain
 *
 * @param {number} time Time in millisecond to wait
 */
export const wait = (time = 1000) => (data) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), time);
  });
};

export const object = {
  toArray(obj) {
    return Object.keys(obj).map(k => ({ ...obj[k], __id__: k }));
  },
};

export const array = {
  toObject(array, idProp = 'id') {
    return array.reduce((acc, item) => {
      acc[item[idProp]] = item;
      return acc;
    }, {});
  }
};
