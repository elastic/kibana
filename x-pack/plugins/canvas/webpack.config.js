const path = require('path');

module.exports = {
  entry: {
    'elements/all': './canvas_plugin_src/elements/register.js',
    'renderers/all': './canvas_plugin_src/renderers/register.js',
    'uis/transforms/all': './canvas_plugin_src/uis/transforms/register.js',
    'uis/models/all': './canvas_plugin_src/uis/models/register.js',
    'uis/views/all': './canvas_plugin_src/uis/views/register.js',
    'uis/datasources/all': './canvas_plugin_src/uis/datasources/register.js',
    'uis/arguments/all': './canvas_plugin_src/uis/arguments/register.js',
    'functions/browser/all': './canvas_plugin_src/functions/browser/register.js',
    'functions/common/all': './canvas_plugin_src/functions/common/register.js',
    'functions/server/all': './canvas_plugin_src/functions/server/register.js',
    'types/all': './canvas_plugin_src/types/register.js',
  },
  target: 'webworker',

  output: {
    path: path.resolve(__dirname, 'canvas_plugin'),
    filename: '[name].js', // Need long paths here.
    libraryTarget: 'umd',
  },

  resolve: {
    extensions: ['.js', '.json'],
  },

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
