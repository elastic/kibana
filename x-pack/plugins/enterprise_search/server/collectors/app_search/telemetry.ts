/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { ISavedObjectsRepository, SavedObjectsServiceStart } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { AS_TELEMETRY_NAME, ITelemetrySavedObject } from '../../saved_objects/app_search/telemetry';

/**
 * Register the telemetry collector
 */

interface Dependencies {
  savedObjects: SavedObjectsServiceStart;
  usageCollection: UsageCollectionSetup;
}

export const registerTelemetryUsageCollector = ({
  usageCollection,
  savedObjects,
}: Dependencies) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector({
    type: 'app_search',
    fetch: async () => fetchTelemetryMetrics(savedObjects),
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};

/**
 * Fetch the aggregated telemetry metrics from our saved objects
 */

const fetchTelemetryMetrics = async (savedObjects: SavedObjectsServiceStart) => {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const savedObjectAttributes = await getSavedObjectAttributesFromRepo(savedObjectsRepository);

  const defaultTelemetrySavedObject: ITelemetrySavedObject = {
    ui_viewed: {
      setup_guide: 0,
      engines_overview: 0,
    },
    ui_error: {
      cannot_connect: 0,
      no_as_account: 0,
    },
    ui_clicked: {
      header_launch_button: 0,
      engine_table_link: 0,
    },
  };

  // If we don't have an existing/saved telemetry object, return the default
  if (!savedObjectAttributes) {
    return defaultTelemetrySavedObject;
  }

  // Iterate through each attribute key and set its saved values
  const attributeKeys = Object.keys(savedObjectAttributes);
  const telemetryObj = defaultTelemetrySavedObject;
  attributeKeys.forEach((key: string) => {
    set(telemetryObj, key, savedObjectAttributes[key]);
  });

  return telemetryObj as ITelemetrySavedObject;
};

/**
 * Helper function - fetches saved objects attributes
 */

interface ISavedObjectAttributes {
  [key: string]: any;
}

const getSavedObjectAttributesFromRepo = async (
  savedObjectsRepository: ISavedObjectsRepository
) => {
  try {
    return (await savedObjectsRepository.get(AS_TELEMETRY_NAME, AS_TELEMETRY_NAME)).attributes;
  } catch (e) {
    return null;
  }
};

/**
 * Set saved objection attributes - used by telemetry route
 */

interface IIncrementUICounter {
  savedObjects: SavedObjectsServiceStart;
  uiAction: string;
  metric: string;
}

export async function incrementUICounter({ savedObjects, uiAction, metric }: IIncrementUICounter) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    AS_TELEMETRY_NAME,
    AS_TELEMETRY_NAME,
    `${uiAction}.${metric}` // e.g., ui_viewed.setup_guide
  );

  return { success: true };
}
