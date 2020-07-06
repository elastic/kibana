/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

export const WS_TELEMETRY_NAME = 'workplace_search_telemetry';

export interface ITelemetrySavedObject {
  ui_viewed: {
    setup_guide: number;
    overview: number;
  };
  ui_error: {
    cannot_connect: number;
    no_ws_account: number;
  };
  ui_clicked: {
    header_launch_button: number;
    org_name_change_button: number;
    onboarding_card_button: number;
    recent_activity_source_details_link: number;
  };
}

export const workplaceSearchTelemetryType: SavedObjectsType = {
  name: WS_TELEMETRY_NAME,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      ui_viewed: {
        properties: {
          setup_guide: {
            type: 'long',
            null_value: 0,
          },
          overview: {
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
          no_ws_account: {
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
          org_name_change_button: {
            type: 'long',
            null_value: 0,
          },
          onboarding_card_button: {
            type: 'long',
            null_value: 0,
          },
          recent_activity_source_details_link: {
            type: 'long',
            null_value: 0,
          },
        },
      },
    },
  },
};
