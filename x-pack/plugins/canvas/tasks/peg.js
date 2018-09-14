/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

const grammarDir = resolve(__dirname, '..', 'common', 'lib');

export default function pegTask(gulp, { pegjs }) {
  gulp.task('canvas:peg:build', function() {
    return gulp
      .src(`${grammarDir}/*.peg`)
      .pipe(
        pegjs({
          format: 'commonjs',
          allowedStartRules: ['expression', 'argument'],
        })
      )
      .pipe(gulp.dest(grammarDir));
  });

  gulp.task('canvas:peg:dev', function() {
    gulp.watch(`${grammarDir}/*.peg`, ['peg']);
  });
}
