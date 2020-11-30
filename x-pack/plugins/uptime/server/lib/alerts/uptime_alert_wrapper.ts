/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AlertExecutorOptions, AlertType, AlertTypeState } from '../../../../alerts/server';
import { savedObjectsAdapter } from '../saved_objects';
import { DynamicSettings } from '../../../common/runtime_types';
import { createUptimeESClient, UptimeESClient } from '../lib';

export interface UptimeAlertType extends Omit<AlertType, 'executor' | 'producer'> {
  executor: ({
    options,
    uptimeEsClient,
    dynamicSettings,
  }: {
    options: AlertExecutorOptions;
    uptimeEsClient: UptimeESClient;
    dynamicSettings: DynamicSettings;
    savedObjectsClient: SavedObjectsClientContract;
  }) => Promise<AlertTypeState | void>;
}

export const uptimeAlertWrapper = (uptimeAlert: UptimeAlertType) => ({
  ...uptimeAlert,
  producer: 'uptime',
  executor: async (options: AlertExecutorOptions) => {
    const {
      services: { scopedClusterClient: esClient, savedObjectsClient },
    } = options;

    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
      options.services.savedObjectsClient
    );

    const uptimeEsClient = createUptimeESClient({ esClient, savedObjectsClient });

    return uptimeAlert.executor({ options, dynamicSettings, uptimeEsClient, savedObjectsClient });
  },
});
