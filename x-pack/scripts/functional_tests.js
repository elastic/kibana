/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();

// The upgrade_assistant_integration tests are for 5.x -> 6.x scenario and don't apply
// to the 6.x -> 7.x scenario.
const isV6 = (process.env.ES_SNAPSHOT_VERSION || '6.').startsWith('6.');
const v6tests = isV6 ? [require.resolve('../test/upgrade_assistant_integration/config')] : [];

require('@kbn/test').runTestsCli([
  require.resolve('../test/reporting/configs/chromium_api.js'),
  require.resolve('../test/reporting/configs/chromium_functional.js'),
  //require.resolve('../test/reporting/configs/phantom_api.js'),
  //require.resolve('../test/reporting/configs/phantom_functional.js'),
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/plugin_api_integration/config.js'),
  require.resolve('../test/saml_api_integration/config.js'),
  require.resolve('../test/token_api_integration/config.js'),
  require.resolve('../test/spaces_api_integration/spaces_only/config'),
  require.resolve('../test/spaces_api_integration/security_and_spaces/config'),
  require.resolve('../test/saved_object_api_integration/security_and_spaces/config'),
  require.resolve('../test/saved_object_api_integration/security_only/config'),
  require.resolve('../test/saved_object_api_integration/spaces_only/config'),
  ...v6tests,
]);
