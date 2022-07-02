/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ESClusterInfo, ESLicense, ListTemplate, TelemetryEvent } from './types';

/**
 * Constructs the configs telemetry schema from a collection of config saved objects
 */
export const templateConfigs = (
  configsData: PackagePolicy[],
  clusterInfo: ESClusterInfo,
  licenseInfo: ESLicense | undefined
) =>
  configsData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
      cluster_uuid: clusterInfo.cluster_uuid,
      cluster_name: clusterInfo.cluster_name,
      license_id: licenseInfo?.uid,
    };

    return {
      ...template,
      ...item,
    };
  });

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

    return {
      ...template,
      id: item.id,
      ...(item.attributes as TelemetryEvent),
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

    return {
      ...template,
      id: item.id,
      ...(item.attributes as TelemetryEvent),
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
