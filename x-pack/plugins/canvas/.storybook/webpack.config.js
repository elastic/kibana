/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const NAME = 'canvasStorybookDLL';
const KIBANA_ROOT = path.resolve(__dirname, '../../../..');
const BUILT_ASSETS = path.resolve(KIBANA_ROOT, 'built_assets');
const DLL_OUTPUT = path.resolve(BUILT_ASSETS, NAME);

// Extend the Storybook Webpack config with some customizations
module.exports = async ({ config, _mode }) => {
  config.profile = true;

  // Include the React preset for Storybook JS files.
  config.module.rules.push({
    test: /\.js$/,
    exclude: /node_modules/,
    loaders: 'babel-loader',
    options: {
      presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
    },
  });

  // Support .ts/x files using the tsconfig from Kibana
  config.module.rules.push({
    test: /\.tsx?$/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
      },
    ],
  });

  // Parse props data for .tsx files
  config.module.rules.push({
    test: /\.tsx$/,
    // Exclude example files, as we don't display props info for them
    exclude: /\.examples.tsx$/,
    use: [
      // Parse TS comments to create Props tables in the UI
      require.resolve('react-docgen-typescript-loader'),
    ],
  });

  // Reference the built DLL file of static(ish) dependencies
  config.plugins.push(
    new webpack.DllReferencePlugin({
      manifest: path.resolve(DLL_OUTPUT, 'manifest.json'),
      context: KIBANA_ROOT,
    })
  );

  // Copy the DLL files to the webpack build for use in the Storybook site
  config.plugins.push(
    new CopyWebpackPlugin([
      {
        from: path.resolve(DLL_OUTPUT, 'dll.js'),
        to: 'dll.js',
      },
      {
        from: path.resolve(DLL_OUTPUT, 'dll.css'),
        to: 'dll.css',
      },
    ])
  );

  // Tell Webpack about the ts/x extensions
  config.resolve.extensions.push('.ts', '.tsx');

  // Alias the any imports from ui/ to the proper directory.
  config.resolve.alias.ui = path.resolve(KIBANA_ROOT, 'src/legacy/ui/public');

  return config;
};
