/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

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
    'functions/server/all': path.join(sourceDir, 'functions/server/register.js'),
    'types/all': path.join(sourceDir, 'types/register.js'),
  },
  target: 'webworker',

  output: {
    path: buildDir,
    filename: '[name].js', // Need long paths here.
    libraryTarget: 'umd',
  },

  resolve: {
    extensions: ['.js', '.json'],
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
        if (stats.compilation.errors && stats.compilation.errors.length) {
          if (isWatch) console.error(stats.compilation.errors[0]);
          else throw stats.compilation.errors[0];
        }
      });
    },
  ],

  module: {
    rules: [
      // There's some React 15 propTypes funny business in EUI, this strips out propTypes and fixes it
      {
        test: /(@elastic\/eui|moment)\/.*\.js$/,
        loaders: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            'react',
            [
              'env',
              {
                targets: {
                  node: 'current',
                },
              },
            ],
          ],
          plugins: [
            'transform-react-remove-prop-types', // specifically this, strips out propTypes
            'pegjs-inline-precompile',
            'transform-object-rest-spread',
            'transform-async-to-generator',
            'transform-class-properties',
            [
              'inline-react-svg',
              {
                ignorePattern: 'images/*',
                svgo: {
                  plugins: [{ cleanupIDs: false }, { removeViewBox: false }],
                },
              },
            ],
          ],
        },
      },
      {
        test: /\.js$/,
        loaders: 'babel-loader',
        options: {
          plugins: [
            'transform-object-rest-spread',
            'transform-async-to-generator',
            'transform-class-properties',
          ],
          presets: [
            'react',
            [
              'env',
              {
                targets: {
                  node: 'current',
                },
              },
            ],
          ],
        },
        exclude: [/node_modules/],
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
