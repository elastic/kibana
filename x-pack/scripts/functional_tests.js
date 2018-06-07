/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();
require('@kbn/test').runTestsCli([
  // Uncomment when https://github.com/elastic/kibana/issues/19563 is resolved.
  // require.resolve('../test/reporting/configs/chromium_api.js'),
  // require.resolve('../test/reporting/configs/chromium_functional.js'),
  require.resolve('../test/reporting/configs/phantom_api.js'),
  require.resolve('../test/reporting/configs/phantom_functional.js'),
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/saml_api_integration/config.js'),
]);
