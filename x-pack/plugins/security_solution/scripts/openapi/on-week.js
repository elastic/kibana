/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { generate } = require('@kbn/openapi-generator');
const { resolve } = require('path');

const SECURITY_SOLUTION_ROOT = resolve(__dirname, '../..');

(async () => {
    await generate({
        title: 'API route handlers',
        rootDir: SECURITY_SOLUTION_ROOT,
        sourceGlob: './common/api/entity_analytics/asset_criticality/**/*.schema.yaml',
        outputDir: './server/lib/entity_analytics/asset_criticality/routes/generated',
        templateName: 'api_request_handler',
        extension: 'handler',
    });
})();
