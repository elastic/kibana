/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/service_dashboards';

export const apmServiceDashboardsMapping: SavedObjectsType = {
  name: APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      serviceName: { type: 'keyword' },
      dashboardId: { type: 'keyword' },
      type: { type: 'keyword' },
      dashboardName: { type: 'text' },
      kuery: { type: 'text' },
      useContextFilter: { type: 'boolean' },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmServiceDashboardsMapping.title', {
        defaultMessage: 'APM Service Custom Dashboard Mappping',
      }),
  },
};
