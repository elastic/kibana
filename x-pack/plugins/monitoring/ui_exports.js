/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Configuration of dependency objects for the UI, which are needed for the
 * Monitoring UI app and views and data for outside the monitoring
 * app (injectDefaultVars and hacks)
 * @return {Object} data per Kibana plugin uiExport schema
 */
export const uiExports = {
  app: {
    title: 'Monitoring',
    order: 9002,
    description: 'Monitoring for Elastic Stack',
    icon: 'plugins/monitoring/icons/monitoring.svg',
    linkToLastSubUrl: false,
    main: 'plugins/monitoring/monitoring',
  },
  injectDefaultVars(server) {
    const config = server.config();
    return {
      monitoringUiEnabled: config.get('xpack.monitoring.ui.enabled')
    };
  },
  hacks: [ 'plugins/monitoring/hacks/toggle_app_link_in_nav' ],
  home: [ 'plugins/monitoring/register_feature' ]
};
