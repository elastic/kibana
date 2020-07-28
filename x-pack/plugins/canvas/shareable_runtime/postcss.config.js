/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line
const autoprefixer = require('autoprefixer');
const prefixer = require('postcss-prefix-selector');

module.exports = {
  plugins: [
    prefixer({
      prefix: '.kbnCanvas',
      transform: function (prefix, selector, prefixedSelector) {
        if (selector === 'body' || selector === 'html') {
          return prefix;
        } else {
          return prefixedSelector;
        }
      },
    }),
    autoprefixer(),
  ],
};
