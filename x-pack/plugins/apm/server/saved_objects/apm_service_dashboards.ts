/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/service_dashboards';

export const apmServiceDashboards: SavedObjectsType = {
  name: APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      dashboardSavedObjectId: { type: 'keyword' },
      dashboardTitle: { type: 'text' },
      kuery: { type: 'text' },
      serviceName: { type: 'keyword' },
      environment: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmServiceDashboards.title', {
        defaultMessage: 'APM Service Custom Dashboards',
      }),
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          dashboardSavedObjectId: schema.string(),
          dashboardTitle: schema.string(),
          kuery: schema.string(),
          serviceName: schema.maybe(schema.string()),
          environment: schema.maybe(schema.string()),
        }),
      },
    },
  },
};
