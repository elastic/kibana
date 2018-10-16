/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


// promisifying the csv-parse parse function

import csvParse from 'csv-parse';

export function parse(data, settings) {
  return new Promise((resolve, reject) => {
    csvParse(data, settings, (err, out) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve(out);
      }
    });
  });
}
