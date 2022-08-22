/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import del from 'del';

module.exports = (on, config) => {
  on('after:spec', (spec, results) => {
    if (results.stats.failures === 0 && results.video) {
      return del(results.video);
    }
  });
};
