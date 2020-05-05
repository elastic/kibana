/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

export const AS_TELEMETRY_NAME = 'app_search_telemetry';

export interface ITelemetrySavedObject {
  ui_viewed: {
    setup_guide: number;
    engines_overview: number;
  };
  ui_error: {
    cannot_connect: number;
    no_as_account: number;
  };
  ui_clicked: {
    header_launch_button: number;
    engine_table_link: number;
  };
}

export const appSearchTelemetryType: SavedObjectsType = {
  name: AS_TELEMETRY_NAME,
  hidden: false,
  namespaceAgnostic: true,
  mappings: {
    properties: {
      ui_viewed: {
        properties: {
          setup_guide: {
            type: 'long',
            null_value: 0,
          },
          engines_overview: {
            type: 'long',
            null_value: 0,
          },
        },
      },
      ui_error: {
        properties: {
          cannot_connect: {
            type: 'long',
            null_value: 0,
          },
          no_as_account: {
            type: 'long',
            null_value: 0,
          },
        },
      },
      ui_clicked: {
        properties: {
          header_launch_button: {
            type: 'long',
            null_value: 0,
          },
          engine_table_link: {
            type: 'long',
            null_value: 0,
          },
        },
      },
    },
  },
};
