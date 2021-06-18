/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import webpackMerge from 'webpack-merge';
import { defaultConfig } from '@kbn/storybook';

import type { Configuration } from 'webpack';

import { KIBANA_ROOT } from './constants';

const canvasWebpack = {
  module: {
    rules: [
      // Enable CSS Modules in Storybook (Shareable Runtime)
      {
        test: /\.module\.s(a|c)ss$/,
        loader: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              path: resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
            },
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
      // Exclude large-dependency, troublesome or irrelevant modules.
      {
        test: [
          resolve(KIBANA_ROOT, 'x-pack/plugins/canvas/public/components/embeddable_flyout'),
          resolve(KIBANA_ROOT, 'x-pack/plugins/reporting/public'),
          resolve(KIBANA_ROOT, 'src/plugins/kibana_legacy/public/angular'),
          resolve(KIBANA_ROOT, 'src/plugins/kibana_legacy/public/paginate'),
        ],
        use: 'null-loader',
      },
    ],
  },
};

module.exports = {
  ...defaultConfig,
  addons: [...(defaultConfig.addons || []), './addon/target/register'],
  webpackFinal: (config: Configuration) => webpackMerge(config, canvasWebpack),
};
