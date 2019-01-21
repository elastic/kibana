const path = require('path');
const TSDocgenPlugin = require('react-docgen-typescript-webpack-plugin');

module.exports = (baseConfig, env, config) => {

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

  config.module.rules.push({
    test: /\.scss$/,
    loaders: ['style-loader', 'css-loader', 'sass-loader'],
    exclude: /node_modules/
  });

  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    use: [
      require.resolve('awesome-typescript-loader'),
      require.resolve("react-docgen-typescript-loader"),
    ],
  });

  config.plugins.push(new TSDocgenPlugin()); // optional
  config.resolve.extensions.push('.ts', '.tsx');
  config.resolve.alias.ui = path.resolve(__dirname, './../../../../src/ui/public');
  return config;
};
