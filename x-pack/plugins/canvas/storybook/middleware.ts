/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
// @ts-expect-error
import serve from 'serve-static';

// Extend the Storybook Middleware to include a route to access Legacy UI assets
module.exports = function (router: { get: (...args: any[]) => void }) {
  router.get(
    '/ui',
    serve(path.resolve(__dirname, '../../../../../src/core/server/core_app/assets'))
  );
};
