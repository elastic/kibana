/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [
    require.resolve('../../test_suites/alerting'),
    require.resolve('../../test_suites/data_view_field_editor'),
    require.resolve('../../test_suites/data_views'),
    require.resolve('../../test_suites/elasticsearch_api'),
    require.resolve('../../test_suites/index_management'),
    require.resolve('../../test_suites/kql_telemetry'),
    require.resolve('../../test_suites/management'),
    require.resolve('../../test_suites/platform_security'),
    require.resolve('../../test_suites/scripts_tests'),
    require.resolve('../../test_suites/search_oss'),
    require.resolve('../../test_suites/search_profiler'),
    require.resolve('../../test_suites/search_xpack'),
    require.resolve('../../test_suites/core'),
    require.resolve('../../test_suites/reporting'),
    require.resolve('../../test_suites/grok_debugger'),
    require.resolve('../../test_suites/painless_lab'),
    require.resolve('../../test_suites/console'),
    require.resolve('../../test_suites/saved_objects_management'),
    require.resolve('../../test_suites/telemetry'),
    require.resolve('../../test_suites/data_usage'),
    require.resolve('../../test_suites/favorites'),
  ],
  junit: {
    reportName: 'Serverless Observability Platform API Integration Tests - Common Group 1',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // include settings from project controller
  esServerArgs: [],
  kbnServerArgs: [
    // defined in MKI control plane
    '--xpack.uptime.service.manifestUrl=mockDevUrl',
    // useful for testing (also enabled in MKI QA)
    '--coreApp.allowDynamicConfigOverrides=true',
    '--xpack.dataUsage.enabled=true',
    '--xpack.dataUsage.enableExperimental=[]',
    // dataUsage.autoops* config is set in kibana controller
    '--xpack.dataUsage.autoops.enabled=true',
    '--xpack.dataUsage.autoops.api.url=http://localhost:9000',
    `--xpack.dataUsage.autoops.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.dataUsage.autoops.api.tls.key=${KBN_KEY_PATH}`,
    `--xpack.reporting.queue.timeout="10m"`,
  ],
});
