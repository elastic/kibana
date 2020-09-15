/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { existsSync } = require('fs');
const { join } = require('path');

// Check for DLL
if (!existsSync(join(__dirname, '../../../../built_assets/canvas_storybook_dll/manifest.json'))) {
  // eslint-disable-next-line no-console
  console.error(
    'No DLL found. Run `node scripts/storybook --dll` from the Canvas plugin directory.'
  );
  process.exit(1);
}

module.exports = {
  stories: ['../**/*.stories.tsx'],
  addons: ['@storybook/addon-actions', '@storybook/addon-knobs', './addon/src/register'],
};
