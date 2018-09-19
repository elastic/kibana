/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import webpack from 'webpack';
import webpackConfig from './helpers/webpack.plugins';

const devtool = 'inline-cheap-module-source-map';

export default function pluginsTasks(gulp, { log, colors }) {
  const onComplete = done => (err, stats) => {
    if (err) {
      done && done(err);
    } else {
      const seconds = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
      log(`${colors.green.bold('canvas:plugins')} Plugins built in ${seconds} seconds`);
      done && done();
    }
  };

  gulp.task('canvas:plugins:build', function(done) {
    webpack({ ...webpackConfig, devtool }, onComplete(done));
  });

  // eslint-disable-next-line no-unused-vars
  gulp.task('canvas:plugins:dev', function(done /* added to make gulp async */) {
    log(`${colors.green.bold('canvas:plugins')} Starting initial build, this will take a while`);
    webpack({ ...webpackConfig, devtool, watch: true }, (err, stats) => {
      onComplete()(err, stats);
    });
  });

  gulp.task('canvas:plugins:build-prod', done => webpack(webpackConfig, onComplete(done)));
}
