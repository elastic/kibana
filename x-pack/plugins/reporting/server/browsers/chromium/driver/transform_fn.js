/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transform as babelTransform } from 'babel-core';
import { memoize } from 'lodash';

const safeWrap = (obj) => {
  const code = obj.toString();
  return new Function(`return (${code}).apply(null, arguments);`);
};

const transform = (code) => {
  const result = babelTransform(code, {
    ast: false,
    babelrc: false,
    presets: [
      [ require.resolve('babel-preset-es2015'), { 'modules': false } ]
    ]
  });
  return result.code;
};

export const transformFn = memoize((fn) => {
  const code = transform(safeWrap(fn));
  return safeWrap(code);
});
