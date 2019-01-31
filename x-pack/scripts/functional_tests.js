/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();
require('@kbn/test').runTestsCli([
  require.resolve('../test/reporting/configs/chromium_api.js'),
  require.resolve('../test/reporting/configs/chromium_functional.js'),
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
  require.resolve('../test/upgrade_assistant_integration/config'),
]);
