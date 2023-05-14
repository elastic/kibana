/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const env = require('./env');

export const get = async () => {
  // const obj = await import('term-size').then(({ default: termSize }) => termSize())
  const obj = {
    columns: 100,
    rows: 100,
  };

  if (env.get('CI')) {
    // reset to 100
    obj.columns = 100;
  }

  return obj;
};

// module.exports = {
//   get,
// };
