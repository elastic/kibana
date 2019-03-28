/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const TSDocgenPlugin = require('react-docgen-typescript-webpack-plugin');

// Extend the Storybook Webpack config with some customizations;
module.exports = (_baseConfig, _env, config) => {

  // Include the React preset for Storybook JS files.
  config.module.rules.push(
    {
      test: /\.js$/,
      include: /\.storybook/,
      loaders: 'babel-loader',
      options: {
        presets: [require.resolve('@babel/preset-react')],
      },
    },
  );

  // Find and alter the CSS rule to replace the Kibana public path string with a path
  // to the route we've added in middleware.js
  const cssRule = config.module.rules.find(rule => rule.test.source.includes('.css$'));
  cssRule.use.push({
    loader: 'string-replace-loader',
    options: {
      search: '__REPLACE_WITH_PUBLIC_PATH__',
      replace: '/',
      flags: 'g'
    }
  });
  
  // Configure loading LESS files from Kibana
  config.module.rules.push({
    test: /\.less$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader', options: { importLoaders: 2 } },
      {
        loader: 'postcss-loader',
        options: {
          config: { path: path.resolve(__dirname, './../../../../src/optimize/postcss.config.js') },
        },
      },
      { loader: 'less-loader' },
    ],
  });

  // Support .ts/x files using the tsconfig from Kibana
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

  // Include the TSDocgen plugin to display Typescript param comments in the stories.
  config.plugins.push(new TSDocgenPlugin());
  
  // Tell Webpack about the ts/x extensions
  config.resolve.extensions.push('.ts', '.tsx');

  // Alias the any imports from ui/ to the proper directory.
  config.resolve.alias.ui = path.resolve(__dirname, './../../../../src/legacy/ui/public');

  return config;
};
