/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';
import { KIBANA_ROOT } from './constants';

export const canvasWebpack = {
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
            options: {
              implementation: require('node-sass'),
            },
          },
        ],
      },
      // Exclude large-dependency, troublesome or irrelevant modules.
      {
        test: [
          resolve(KIBANA_ROOT, 'x-pack/plugins/canvas/public/components/embeddable_flyout'),
          resolve(KIBANA_ROOT, 'x-pack/plugins/reporting/public'),
        ],
        use: 'null-loader',
      },
    ],
  },
  resolve: {
    alias: {
      'src/plugins': resolve(KIBANA_ROOT, 'src/plugins'),
    },
  },
};

export const canvasStorybookConfig = {
  ...defaultConfig,
  addons: [...(defaultConfig.addons || []), './addon/target/register'],
  ...mergeWebpackFinal(canvasWebpack),
};
