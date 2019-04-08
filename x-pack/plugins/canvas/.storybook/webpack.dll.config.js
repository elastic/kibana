/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { DLL_NAME, DLL_OUTPUT, KIBANA_ROOT } = require('./constants');

module.exports = {
  context: KIBANA_ROOT,
  mode: 'development',
  entry: [
    '@elastic/eui',
    '@elastic/eui/dist/eui_theme_light.css',
    '@kbn/ui-framework/dist/kui_light.css',
    '@storybook/addon-actions',
    '@storybook/addon-actions/register',
    '@storybook/addon-info',
    '@storybook/addon-knobs',
    '@storybook/addon-knobs/react',
    '@storybook/addon-knobs/register',
    '@storybook/addon-options',
    '@storybook/addon-options/register',
    '@storybook/core',
    '@storybook/core/dist/server/common/polyfills.js',
    '@storybook/react',
    '@storybook/theming',
    'chroma-js',
    'lodash',
    'prop-types',
    'react-dom',
    'react',
    'recompose',
    'tinycolor2',
    require.resolve('./dll_contexts'),
  ],
  plugins: [
    new webpack.DllPlugin({
      name: DLL_NAME,
      path: path.resolve(DLL_OUTPUT, 'manifest.json'),
    }),
    new MiniCssExtractPlugin({
      filename: 'dll.css',
    }),
  ],
  output: {
    path: DLL_OUTPUT,
    filename: 'dll.js',
    library: DLL_NAME,
  },
  resolve: {
    alias: {
      ui: path.resolve(KIBANA_ROOT, 'src/legacy/ui/public'),
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        exclude: [/canvas.+light.css/],
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          { loader: 'css-loader' },
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
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { importLoaders: 2 } },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
          },
          { loader: 'less-loader' },
        ],
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
        loader: 'file-loader',
      },
    ],
  },
};
