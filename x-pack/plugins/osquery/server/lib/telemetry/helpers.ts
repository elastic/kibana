/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SavedObjectsFindResponse } from 'kibana/server';
import { copyAllowlistedFields, packEventFields, savedQueryEventFields } from './filters';
import type { ESClusterInfo, ESLicense, ListTemplate, TelemetryEvent } from './types';

/**
 * Chunks an Array<T> into an Array<Array<T>>
 * This is to prevent overloading the telemetry channel + user resources
 *
 * @param telemetryRecords
 * @param batchSize
 * @returns the batch of records
 */
export const batchTelemetryRecords = (
  telemetryRecords: unknown[],
  batchSize: number
): unknown[][] =>
  [...Array(Math.ceil(telemetryRecords.length / batchSize))].map(() =>
    telemetryRecords.splice(0, batchSize)
  );

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templatePacks = (
  packsData: SavedObjectsFindResponse['saved_objects'],
  clusterInfo: ESClusterInfo,
  licenseInfo: ESLicense | undefined
) =>
  packsData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
      cluster_uuid: clusterInfo.cluster_uuid,
      cluster_name: clusterInfo.cluster_name,
      license_id: licenseInfo?.uid,
    };

    // cast exception list type to a TelemetryEvent for allowlist filtering
    const filteredPackItem = copyAllowlistedFields(
      packEventFields,
      item.attributes as unknown as TelemetryEvent
    );

    return {
      ...template,
      id: item.id,
      ...filteredPackItem,
    };
  });

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templateSavedQueries = (
  savedQueriesData: SavedObjectsFindResponse['saved_objects'],
  clusterInfo: ESClusterInfo,
  licenseInfo: ESLicense | undefined
) =>
  savedQueriesData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
      cluster_uuid: clusterInfo.cluster_uuid,
      cluster_name: clusterInfo.cluster_name,
      license_id: licenseInfo?.uid,
    };

    // cast exception list type to a TelemetryEvent for allowlist filtering
    const filteredSavedQueryItem = copyAllowlistedFields(
      savedQueryEventFields,
      item.attributes as unknown as TelemetryEvent
    );

    return {
      ...template,
      id: item.id,
      ...filteredSavedQueryItem,
    };
  });

/**
 * Convert counter label list to kebab case
 *
 * @param label_list the list of labels to create standardized UsageCounter from
 * @returns a string label for usage in the UsageCounter
 */
export function createUsageCounterLabel(labelList: string[]): string {
  return labelList.join('-');
}
