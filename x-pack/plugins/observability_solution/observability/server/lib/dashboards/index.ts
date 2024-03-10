/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { ObsDashboardSections } from '../../../common/dashboards';

export const OBS_DASHBOARD_SECTIONS_SO_TYPE = 'obs_dashboard_sections';

export const obsDashboardSections: SavedObjectsType<ObsDashboardSections> = {
  name: OBS_DASHBOARD_SECTIONS_SO_TYPE,
  hidden: false, // Change later
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      sections: {
        properties: {
          title: { type: 'keyword' },
        },
      },
    },
  },
  management: {
    importableAndExportable: true, // Change later
  },
};
