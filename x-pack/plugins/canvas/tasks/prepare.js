/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default gulp => {
  // anything that needs to happen pre-build or pre-dev
  gulp.task('canvas:prepare', ['canvas:plugins:build-prod']);
};
