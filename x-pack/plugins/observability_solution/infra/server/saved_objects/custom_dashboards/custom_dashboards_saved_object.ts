/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFieldMapping, SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { InfraCustomDashboard } from '../../../common/custom_dashboards';

export const INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE = 'infra-custom-dashboards';

const properties: Record<keyof InfraCustomDashboard, SavedObjectsFieldMapping> = {
  assetType: {
    type: 'keyword',
  },
  dashboardSavedObjectId: {
    type: 'keyword',
  },
  dashboardFilterAssetIdEnabled: {
    type: 'boolean',
  },
};

export const infraCustomDashboardsSavedObjectType: SavedObjectsType = {
  name: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties,
  },
  management: {
    importableAndExportable: true,
    icon: 'infraApp',
    getTitle: () =>
      i18n.translate('xpack.infra.infraAssetCustomDashboards.', {
        defaultMessage: 'Infrastructure Asset Custom Dashboards',
      }),
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          dashboardIdList: schema.arrayOf(schema.string()),
          assetType: schema.string(),
          kuery: schema.maybe(schema.string()),
        }),
      },
    },
    '2': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            dashboardSavedObjectId: {
              type: 'keyword',
            },
            dashboardFilterAssetIdEnabled: {
              type: 'boolean',
            },
          },
        },
        {
          type: 'mappings_deprecation',
          deprecatedMappings: ['dashboardIdList', 'kuery'],
        },
      ],
      schemas: {
        create: schema.object({
          dashboardSavedObjectId: schema.string(),
          assetType: schema.string(),
          dashboardFilterAssetIdEnabled: schema.boolean(),
        }),
      },
    },
  },
};
