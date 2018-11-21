/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sourceDir = path.resolve(__dirname, '../../canvas_plugin_src');
const buildDir = path.resolve(__dirname, '../../canvas_plugin');

module.exports = {
  entry: {
    'elements/all': path.join(sourceDir, 'elements/register.js'),
    'renderers/all': path.join(sourceDir, 'renderers/register.js'),
    'uis/transforms/all': path.join(sourceDir, 'uis/transforms/register.js'),
    'uis/models/all': path.join(sourceDir, 'uis/models/register.js'),
    'uis/views/all': path.join(sourceDir, 'uis/views/register.js'),
    'uis/datasources/all': path.join(sourceDir, 'uis/datasources/register.js'),
    'uis/arguments/all': path.join(sourceDir, 'uis/arguments/register.js'),
    'functions/browser/all': path.join(sourceDir, 'functions/browser/register.js'),
    'functions/common/all': path.join(sourceDir, 'functions/common/register.js'),
    'types/all': path.join(sourceDir, 'types/register.js'),
  },

  // there were problems with the node and web targets since this code is actually
  // targetting both the browser and node.js. If there was a hybrid target we'd use
  // it, but this seems to work either way.
  target: 'webworker',

  output: {
    path: buildDir,
    filename: '[name].js', // Need long paths here.
    libraryTarget: 'umd',
  },

  resolve: {
    extensions: ['.js', '.json'],
    mainFields: ['browser', 'main'],
  },

  plugins: [
    function loaderFailHandler() {
      // bails on error, including loader errors
      // see https://github.com/webpack/webpack/issues/708, which does not fix loader errors
      let isWatch = true;

      this.plugin('run', function(compiler, callback) {
        isWatch = false;
        callback.call(compiler);
      });

      this.plugin('done', function(stats) {
        if (!stats.hasErrors()) return;
        const errorMessage = stats.toString('errors-only');
        if (isWatch) console.error(errorMessage);
        else throw new Error(errorMessage);
      });
    },
    new CopyWebpackPlugin([
      {
        from: `${sourceDir}/functions/server/`,
        to: `${buildDir}/functions/server/`,
        ignore: '**/__tests__/**',
      },
    ]),
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        loaders: 'babel-loader',
        options: {
          babelrc: false,
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
      },
      {
        test: /\.(png|jpg|gif|jpeg|svg)$/,
        loaders: ['url-loader'],
      },
      {
        test: /\.(css|scss)$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },

  node: {
    // Don't replace built-in globals
    __filename: false,
    __dirname: false,
  },

  watchOptions: {
    ignored: [/node_modules/],
  },
};
