/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const webpack = require('webpack');
// eslint-disable-next-line
const { stringifyRequest } = require('loader-utils');

const {
  KIBANA_ROOT,
  EXPRESSION_EXPLORER_NAME,
  EXPRESSION_EXPLORER_OUTPUT,
} = require('./constants');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  context: KIBANA_ROOT,
  entry: { [EXPRESSION_EXPLORER_NAME]: require.resolve('./index.tsx') },
  mode: isProd ? 'production' : 'development',
  output: {
    path: EXPRESSION_EXPLORER_OUTPUT,
    filename: '[name].js',
  },
  plugins: [
    // replace imports for `uiExports/*` modules with a synthetic module
    // created by create_ui_exports_module.js
    new webpack.NormalModuleReplacementPlugin(/^uiExports\//, resource => {
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
  ],
  // Include a require alias for legacy UI code and styles
  resolve: {
    alias: {
      'ui/notify': path.resolve(__dirname, '../tasks/mocks/uiNotify'),
      'ui/chrome': path.resolve(__dirname, '../tasks/mocks/uiChrome'),
      ui: path.resolve(KIBANA_ROOT, 'src/legacy/ui/public'),
      'src/plugins': path.resolve(KIBANA_ROOT, 'src/plugins'),
    },
    extensions: ['.js', '.json', '.ts', '.tsx'],
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
                  path.resolve(KIBANA_ROOT, 'src/legacy/ui/public/styles/_styling_constants.scss')
                )};\n`;
              },
              sassOptions: {
                includePaths: [path.resolve(KIBANA_ROOT, 'node_modules')],
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: path.resolve(KIBANA_ROOT, 'src/optimize/postcss.config.js'),
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
        test: require.resolve('jquery'),
        loader: 'expose-loader?jQuery!expose-loader?$',
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
        loader: 'url-loader',
        sideEffects: false,
      },
      {
        test: /\.(png)(\?|$)/,
        loader: 'file-loader',
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
          // require.resolve('highlight.js'),
          path.resolve(__dirname, '../canvas_plugin_src/renderers/embeddable/embeddable.tsx'),
        ],
        use: require.resolve('null-loader'),
      },
    ],
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
    net: 'empty',
  },
};
