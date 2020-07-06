/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const webpack = require('webpack');
const { stringifyRequest } = require('loader-utils'); // eslint-disable-line

const {
  KIBANA_ROOT,
  SHAREABLE_RUNTIME_OUTPUT,
  LIBRARY_NAME,
  SHAREABLE_RUNTIME_NAME,
} = require('./constants');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  context: KIBANA_ROOT,
  entry: {
    [SHAREABLE_RUNTIME_NAME]: require.resolve('./index.ts'),
  },
  mode: isProd ? 'production' : 'development',
  plugins: isProd ? [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })] : [],
  output: {
    path: SHAREABLE_RUNTIME_OUTPUT,
    filename: '[name].js',
    library: LIBRARY_NAME,
  },
  // Include a require alias for legacy UI code and styles
  resolve: {
    alias: {
      ui: path.resolve(KIBANA_ROOT, 'src/legacy/ui/public'),
      'data/interpreter': path.resolve(
        KIBANA_ROOT,
        'src/plugins/data/public/expressions/interpreter'
      ),
      'kbn/interpreter': path.resolve(KIBANA_ROOT, 'packages/kbn-interpreter/target/common'),
      'types/interpreter': path.resolve(
        KIBANA_ROOT,
        'src/legacy/core_plugins/interpreter/public/types'
      ),
      tinymath: path.resolve(KIBANA_ROOT, 'node_modules/tinymath/lib/tinymath.es5.js'),
    },
    extensions: ['.js', '.json', '.ts', '.tsx', '.scss'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loaders: 'babel-loader',
        options: {
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
        sideEffects: false,
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        ],
        sideEffects: false,
      },
      {
        test: /\.css$/,
        exclude: /components/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: require.resolve('./postcss.config.js'),
              },
            },
          },
          {
            loader: 'string-replace-loader',
            options: {
              search: '__REPLACE_WITH_PUBLIC_PATH__',
              replace: '/',
              flags: 'g',
            },
          },
        ],
      },
      {
        test: /\.module\.s(a|c)ss$/,
        loader: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
              },
              localsConvention: 'camelCase',
              sourceMap: !isProd,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: !isProd,
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { importLoaders: 2 } },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: require.resolve('./postcss.config.js'),
              },
            },
          },
          { loader: 'less-loader' },
        ],
      },
      {
        test: /\.scss$/,
        exclude: [/node_modules/, /\.module\.s(a|c)ss$/],
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: !isProd,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProd,
              config: {
                path: require.resolve('./postcss.config'),
              },
            },
          },
          {
            loader: 'resolve-url-loader',
            options: {
              // eslint-disable-next-line no-unused-vars
              join: (_, __) => (uri, base) => {
                if (!base) {
                  return null;
                }

                // manually force ui/* urls in legacy styles to resolve to ui/legacy/public
                if (uri.startsWith('ui/') && base.split(path.sep).includes('legacy')) {
                  return path.resolve(KIBANA_ROOT, 'src/legacy/ui/public', uri.replace('ui/', ''));
                }

                return null;
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              // must always be enabled as long as we're using the `resolve-url-loader` to
              // rewrite `ui/*` urls. They're dropped by subsequent loaders though
              sourceMap: true,
              prependData(loaderContext) {
                return `@import ${stringifyRequest(
                  loaderContext,
                  path.resolve(KIBANA_ROOT, 'src/legacy/ui/public/styles/_globals_v7light.scss')
                )};\n`;
              },
              webpackImporter: false,
              sassOptions: {
                outputStyle: 'nested',
                includePaths: [path.resolve(KIBANA_ROOT, 'node_modules')],
              },
            },
          },
        ],
      },
      {
        test: require.resolve('jquery'),
        loader: 'expose-loader?jQuery!expose-loader?$',
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
        loader: 'url-loader',
        sideEffects: false,
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
      {
        test: [
          require.resolve('@elastic/eui/es/components/code_editor'),
          require.resolve('@elastic/eui/es/components/drag_and_drop'),
          require.resolve('@elastic/eui/packages/react-datepicker'),
          require.resolve('highlight.js'),
        ],
        use: require.resolve('null-loader'),
      },
    ],
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
};
