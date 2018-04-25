/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();
require('@kbn/test').runTests(
  [
    'x-pack/test/functional/config.js',
    'x-pack/test/api_integration/config.js',
    'x-pack/test/saml_api_integration/config.js',
  ],
);
