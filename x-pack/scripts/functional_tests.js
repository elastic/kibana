/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const alwaysImportedTests = [
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/security_solution_endpoint/config.ts'),
  require.resolve('../test/functional_with_es_ssl/config.ts'),
  require.resolve('../test/functional/config_security_basic.ts'),
  require.resolve('../test/functional/config_security_trial.ts'),
];
const onlyNotInCoverageTests = [
  require.resolve('../test/api_integration/config_security_basic.ts'),
  require.resolve('../test/api_integration/config_security_trial.ts'),
  require.resolve('../test/api_integration/config.ts'),
  require.resolve('../test/alerting_api_integration/basic/config.ts'),
  require.resolve('../test/alerting_api_integration/spaces_only/config.ts'),
  require.resolve('../test/alerting_api_integration/security_and_spaces/config.ts'),
  require.resolve('../test/apm_api_integration/basic/config.ts'),
  require.resolve('../test/apm_api_integration/trial/config.ts'),
  require.resolve('../test/detection_engine_api_integration/security_and_spaces/config.ts'),
  require.resolve('../test/detection_engine_api_integration/basic/config.ts'),
  require.resolve('../test/plugin_api_integration/config.ts'),
  require.resolve('../test/kerberos_api_integration/config.ts'),
  require.resolve('../test/kerberos_api_integration/anonymous_access.config.ts'),
  require.resolve('../test/saml_api_integration/config.ts'),
  require.resolve('../test/token_api_integration/config.js'),
  require.resolve('../test/oidc_api_integration/config.ts'),
  require.resolve('../test/oidc_api_integration/implicit_flow.config.ts'),
  require.resolve('../test/observability_api_integration/basic/config.ts'),
  require.resolve('../test/observability_api_integration/trial/config.ts'),
  require.resolve('../test/pki_api_integration/config.ts'),
  require.resolve('../test/login_selector_api_integration/config.ts'),
  require.resolve('../test/encrypted_saved_objects_api_integration/config.ts'),
  require.resolve('../test/spaces_api_integration/spaces_only/config.ts'),
  require.resolve('../test/spaces_api_integration/security_and_spaces/config_trial.ts'),
  require.resolve('../test/spaces_api_integration/security_and_spaces/config_basic.ts'),
  require.resolve('../test/saved_object_api_integration/security_and_spaces/config_trial.ts'),
  require.resolve('../test/saved_object_api_integration/security_and_spaces/config_basic.ts'),
  require.resolve('../test/saved_object_api_integration/security_only/config_trial.ts'),
  require.resolve('../test/saved_object_api_integration/security_only/config_basic.ts'),
  require.resolve('../test/saved_object_api_integration/spaces_only/config.ts'),
  require.resolve('../test/ui_capabilities/security_and_spaces/config.ts'),
  require.resolve('../test/ui_capabilities/security_only/config.ts'),
  require.resolve('../test/ui_capabilities/spaces_only/config.ts'),
  require.resolve('../test/upgrade_assistant_integration/config.js'),
  require.resolve('../test/licensing_plugin/config.ts'),
  require.resolve('../test/licensing_plugin/config.public.ts'),
  require.resolve('../test/licensing_plugin/config.legacy.ts'),
  require.resolve('../test/endpoint_api_integration_no_ingest/config.ts'),
  require.resolve('../test/reporting_api_integration/config.js'),
  require.resolve('../test/functional_embedded/config.ts'),
  require.resolve('../test/ingest_manager_api_integration/config.ts'),
  require.resolve('../test/functional_enterprise_search/without_host_configured.config.ts'),
];

require('@kbn/plugin-helpers').babelRegister();
require('@kbn/test').runTestsCli([
  ...alwaysImportedTests,
  ...(!!process.env.CODE_COVERAGE ? [] : onlyNotInCoverageTests),
]);
