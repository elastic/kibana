/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { SavedObjectsServiceStart, Logger } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import { getSavedObjectAttributesFromRepo } from '../lib/telemetry';

interface Telemetry {
  ui_viewed: {
    setup_guide: number;
    overview: number;
  };
  ui_error: {
    cannot_connect: number;
    not_found: number;
  };
  ui_clicked: {
    header_launch_button: number;
    org_name_change_button: number;
    onboarding_card_button: number;
    recent_activity_source_details_link: number;
  };
}

export const WS_TELEMETRY_NAME = 'workplace_search_telemetry';

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (
  usageCollection: UsageCollectionSetup,
  savedObjects: SavedObjectsServiceStart,
  log: Logger
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<Telemetry>({
    type: 'workplace_search',
    fetch: async () => fetchTelemetryMetrics(savedObjects, log),
    isReady: () => true,
    schema: {
      ui_viewed: {
        setup_guide: { type: 'long' },
        overview: { type: 'long' },
      },
      ui_error: {
        cannot_connect: { type: 'long' },
        not_found: { type: 'long' },
      },
      ui_clicked: {
        header_launch_button: { type: 'long' },
        org_name_change_button: { type: 'long' },
        onboarding_card_button: { type: 'long' },
        recent_activity_source_details_link: { type: 'long' },
      },
    },
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};

/**
 * Fetch the aggregated telemetry metrics from our saved objects
 */

const fetchTelemetryMetrics = async (savedObjects: SavedObjectsServiceStart, log: Logger) => {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const savedObjectAttributes = await getSavedObjectAttributesFromRepo(
    WS_TELEMETRY_NAME,
    savedObjectsRepository,
    log
  );

  const defaultTelemetrySavedObject: Telemetry = {
    ui_viewed: {
      setup_guide: 0,
      overview: 0,
    },
    ui_error: {
      cannot_connect: 0,
      not_found: 0,
    },
    ui_clicked: {
      header_launch_button: 0,
      org_name_change_button: 0,
      onboarding_card_button: 0,
      recent_activity_source_details_link: 0,
    },
  };

  // If we don't have an existing/saved telemetry object, return the default
  if (!savedObjectAttributes) {
    return defaultTelemetrySavedObject;
  }

  return {
    ui_viewed: {
      setup_guide: get(savedObjectAttributes, 'ui_viewed.setup_guide', 0),
      overview: get(savedObjectAttributes, 'ui_viewed.overview', 0),
    },
    ui_error: {
      cannot_connect: get(savedObjectAttributes, 'ui_error.cannot_connect', 0),
      not_found: get(savedObjectAttributes, 'ui_error.not_found', 0),
    },
    ui_clicked: {
      header_launch_button: get(savedObjectAttributes, 'ui_clicked.header_launch_button', 0),
      org_name_change_button: get(savedObjectAttributes, 'ui_clicked.org_name_change_button', 0),
      onboarding_card_button: get(savedObjectAttributes, 'ui_clicked.onboarding_card_button', 0),
      recent_activity_source_details_link: get(
        savedObjectAttributes,
        'ui_clicked.recent_activity_source_details_link',
        0
      ),
    },
  } as Telemetry;
};
