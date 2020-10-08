/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const { stringifyRequest } = require('loader-utils');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DLL_OUTPUT, KIBANA_ROOT } = require('./constants');

// Extend the Storybook Webpack config with some customizations
module.exports = async ({ config: storybookConfig }) => {
  const config = {
    module: {
      rules: [
        // Include the React preset from Kibana for JS(X) and TS(X)
        {
          test: /\.(j|t)sx?$/,
          exclude: /node_modules/,
          loaders: 'babel-loader',
          options: {
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
        // Parse props data for .tsx files
        // This is notoriously slow, and is making Storybook unusable.  Disabling for now.
        // See: https://github.com/storybookjs/storybook/issues/7998
        //
        // {
        //   test: /\.tsx$/,
        //   // Exclude example files, as we don't display props info for them
        //   exclude: /\.examples.tsx$/,
        //   use: [
        //     // Parse TS comments to create Props tables in the UI
        //     require.resolve('react-docgen-typescript-loader'),
        //   ],
        // },
        // Enable SASS, but exclude CSS Modules in Storybook
        {
          test: /\.scss$/,
          exclude: /\.module.(s(a|c)ss)$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader', options: { importLoaders: 2 } },
            {
              loader: 'postcss-loader',
              options: {
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
            {
              loader: 'sass-loader',
              options: {
                prependData(loaderContext) {
                  return `@import ${stringifyRequest(
                    loaderContext,
                    path.resolve(
                      KIBANA_ROOT,
                      'src/core/public/core_app/styles/_globals_v7light.scss'
                    )
                  )};\n`;
                },
                sassOptions: {
                  includePaths: [path.resolve(KIBANA_ROOT, 'node_modules')],
                },
              },
            },
          ],
        },
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
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
            {
              loader: 'sass-loader',
            },
          ],
        },
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        // Exclude large-dependency, troublesome or irrelevant modules.
        {
          test: [
            path.resolve(__dirname, '../public/components/embeddable_flyout'),
            path.resolve(__dirname, '../../reporting/public'),
            path.resolve(__dirname, '../../../../src/plugins/kibana_legacy/public/angular'),
            path.resolve(__dirname, '../../../../src/plugins/kibana_legacy/public/paginate'),
          ],
          use: 'null-loader',
        },
      ],
    },
    plugins: [
      // Reference the built DLL file of static(ish) dependencies, which are removed
      // during kbn:bootstrap and rebuilt if missing.
      new webpack.DllReferencePlugin({
        manifest: path.resolve(DLL_OUTPUT, 'manifest.json'),
        context: KIBANA_ROOT,
      }),
      // Ensure jQuery is global for Storybook, specifically for the runtime.
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
      }),
      // Copy the DLL files to the Webpack build for use in the Storybook UI
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(DLL_OUTPUT, 'dll.js'),
            to: 'dll.js',
          },
          {
            from: path.resolve(DLL_OUTPUT, 'dll.css'),
            to: 'dll.css',
          },
        ],
      }),
      // replace imports for `uiExports/*` modules with a synthetic module
      // created by create_ui_exports_module.js
      new webpack.NormalModuleReplacementPlugin(/^uiExports\//, (resource) => {
        // uiExports used by Canvas
        const extensions = {
          hacks: [],
          chromeNavControls: [],
        };

        // everything following the first / in the request is
        // treated as a type of appExtension
        const type = resource.request.slice(resource.request.indexOf('/') + 1);

        resource.request = [
          // the "val-loader" is used to execute create_ui_exports_module
          // and use its return value as the source for the module in the
          // bundle. This allows us to bypass writing to the file system
          require.resolve('val-loader'),
          '!',
          require.resolve(KIBANA_ROOT + '/src/optimize/create_ui_exports_module'),
          '?',
          // this JSON is parsed by create_ui_exports_module and determines
          // what require() calls it will execute within the bundle
          JSON.stringify({ type, modules: extensions[type] || [] }),
        ].join('');
      }),

      new webpack.NormalModuleReplacementPlugin(
        /lib\/download_workpad/,
        path.resolve(__dirname, '../tasks/mocks/downloadWorkpad')
      ),
      new webpack.NormalModuleReplacementPlugin(
        /(lib)?\/custom_element_service/,
        path.resolve(__dirname, '../tasks/mocks/customElementService')
      ),
      new webpack.NormalModuleReplacementPlugin(
        /(lib)?\/ui_metric/,
        path.resolve(__dirname, '../tasks/mocks/uiMetric')
      ),
      new webpack.NormalModuleReplacementPlugin(
        /lib\/es_service/,
        path.resolve(__dirname, '../tasks/mocks/esService')
      ),
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.scss', '.mjs', '.html'],
      alias: {
        'ui/url/absolute_to_parsed_url': path.resolve(
          __dirname,
          '../tasks/mocks/uiAbsoluteToParsedUrl'
        ),
      },
    },
  };

  // Find and alter the CSS rule to replace the Kibana public path string with a path
  // to the route we've added in middleware.js
  const cssRule = storybookConfig.module.rules.find((rule) => rule.test.source.includes('.css$'));
  cssRule.use.push({
    loader: 'string-replace-loader',
    options: {
      search: '__REPLACE_WITH_PUBLIC_PATH__',
      replace: '/',
      flags: 'g',
    },
  });

  return webpackMerge(storybookConfig, config);
};
