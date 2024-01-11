/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { ObsIntegrationMetadata } from '../../../common/integrations';

export const OBS_INTEGRATION_METADATA_SO_TYPE = 'obs_integration_metadata';

export const obsIntegrationMetadata: SavedObjectsType<ObsIntegrationMetadata> = {
  name: OBS_INTEGRATION_METADATA_SO_TYPE,
  hidden: false, // Change later
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      integration_name: { type: 'keyword' }, // or can I find it by using a good ID?
      display_name: { type: 'keyword' },
      display_icon: { type: 'keyword' },
      overview_dashboard_id: { type: 'keyword' },
      assets: {
        properties: {
          display_name: { type: 'keyword' },
          display_icon: { type: 'keyword' },
          identifier_field: { type: 'keyword' },
          display_name_field: { type: 'keyword' },
          // Should the dashboards be optional?
          // Maybe if we can somehow link to that assets data in some other way?
          overview_dashboard_id: { type: 'keyword' },
          details_dashboard_id: { type: 'keyword' },
          // How do I add log data to this?
        },
      },
    },
  },
  management: {
    importableAndExportable: true, // Change later
  },
};
