/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('@kbn/plugin-helpers').babelRegister();

require('@kbn/test').runTestsCli([
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/functional_with_es_ssl/config.ts'),
  require.resolve('../test/functional/config_security_basic.ts'),
  require.resolve('../test/functional/config_security_trial.ts'),
  require.resolve('../test/api_integration/config_security_basic.js'),
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/alerting_api_integration/basic/config.ts'),
  require.resolve('../test/alerting_api_integration/spaces_only/config.ts'),
  require.resolve('../test/alerting_api_integration/security_and_spaces/config.ts'),
  require.resolve('../test/apm_api_integration/basic/config.ts'),
  require.resolve('../test/apm_api_integration/trial/config.ts'),
  require.resolve('../test/detection_engine_api_integration/security_and_spaces/config.ts'),
  require.resolve('../test/detection_engine_api_integration/basic/config.ts'),
  require.resolve('../test/plugin_api_integration/config.ts'),
  require.resolve('../test/kerberos_api_integration/config'),
  require.resolve('../test/kerberos_api_integration/anonymous_access.config'),
  require.resolve('../test/saml_api_integration/config'),
  require.resolve('../test/token_api_integration/config'),
  require.resolve('../test/oidc_api_integration/config'),
  require.resolve('../test/oidc_api_integration/implicit_flow.config'),
  require.resolve('../test/observability_api_integration/basic/config.ts'),
  require.resolve('../test/observability_api_integration/trial/config.ts'),
  require.resolve('../test/pki_api_integration/config'),
  require.resolve('../test/login_selector_api_integration/config'),
  require.resolve('../test/encrypted_saved_objects_api_integration/config'),
  require.resolve('../test/spaces_api_integration/spaces_only/config'),
  require.resolve('../test/spaces_api_integration/security_and_spaces/config_trial'),
  require.resolve('../test/spaces_api_integration/security_and_spaces/config_basic'),
  require.resolve('../test/saved_object_api_integration/security_and_spaces/config_trial'),
  require.resolve('../test/saved_object_api_integration/security_and_spaces/config_basic'),
  require.resolve('../test/saved_object_api_integration/security_only/config_trial'),
  require.resolve('../test/saved_object_api_integration/security_only/config_basic'),
  require.resolve('../test/saved_object_api_integration/spaces_only/config'),
  require.resolve('../test/ui_capabilities/security_and_spaces/config'),
  require.resolve('../test/ui_capabilities/security_only/config'),
  require.resolve('../test/ui_capabilities/spaces_only/config'),
  require.resolve('../test/upgrade_assistant_integration/config'),
  require.resolve('../test/licensing_plugin/config'),
  require.resolve('../test/licensing_plugin/config.public'),
  require.resolve('../test/licensing_plugin/config.legacy'),
  require.resolve('../test/endpoint_api_integration_no_ingest/config.ts'),
  require.resolve('../test/reporting_api_integration/config.js'),
]);
