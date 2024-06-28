/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../common/custom_dashboards';

export const apmCustomDashboards: SavedObjectsType = {
  name: APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      dashboardSavedObjectId: { type: 'keyword' },
      kuery: { type: 'text' },
      serviceEnvironmentFilterEnabled: { type: 'boolean' },
      serviceNameFilterEnabled: { type: 'boolean' },
    },
  },
  management: {
    importableAndExportable: true,
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
          kuery: schema.maybe(schema.string()),
          serviceEnvironmentFilterEnabled: schema.boolean(),
          serviceNameFilterEnabled: schema.boolean(),
        }),
      },
    },
  },
};
