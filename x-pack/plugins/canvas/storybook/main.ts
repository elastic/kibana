/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

module.exports = {
  stories: ['../**/*.stories.tsx'],
  addons: [
    '@storybook/addon-actions',
    '@storybook/addon-knobs',
    './storybook/addon/target/register',
  ],
};
