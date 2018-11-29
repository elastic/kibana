/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dev from './dev';
import plugins from './plugins';
import prepare from './prepare';
import test from './test';

export default function canvasTasks(gulp, gulpHelpers) {
  dev(gulp, gulpHelpers);
  plugins(gulp, gulpHelpers);
  prepare(gulp, gulpHelpers);
  test(gulp, gulpHelpers);
}
