/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const TSDocgenPlugin = require('react-docgen-typescript-webpack-plugin');

module.exports = (_baseConfig, _env, config) => {
  config.module.rules.push(
    {
      test: /\.js$/,
      include: /\.storybook/,
      loaders: 'babel-loader',
      options: {
        presets: [require.resolve('babel-preset-react')],
      },
    },
  );

  config.module.rules.push({
    test: /\.scss$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader', options: { importLoaders: 2 } },
      {
        loader: 'postcss-loader',
        options: {
          config: { path: path.resolve(__dirname, './../../../../src/optimize/postcss.config.js') },
        },
      },
      { loader: 'sass-loader' },
      {
        loader: 'sass-resources-loader',
        options: {
          resources: ['../../../node_modules/@elastic/eui/src/theme_light.scss'],
        },
      },
    ],
    include: [
      path.resolve(__dirname, '../'),
    ],
  });

  config.module.rules.push({
    test: /\.tsx?$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
          onlyCompileBundledFiles: true,
          configFile: require.resolve('../../../../tsconfig.json'),
          compilerOptions: {
            sourceMap: true,
          },
        },
      },
      require.resolve('react-docgen-typescript-loader'),
    ],
  });

  config.plugins.push(new TSDocgenPlugin());
  config.resolve.extensions.push('.ts', '.tsx');
  config.resolve.alias.ui = path.resolve(__dirname, './../../../../src/ui/public');
  return config;
};
