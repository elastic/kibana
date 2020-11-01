/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecutorOptions, AlertType, AlertTypeState } from '../../../../alerts/server';
import { savedObjectsAdapter } from '../saved_objects';
import { DynamicSettings } from '../../../common/runtime_types';
import { createUptimeESClient, UptimeESClient } from '../lib';

export interface UptimeAlertType extends Omit<AlertType, 'executor' | 'producer'> {
  executor: ({
    options,
    uptimeESClient,
    dynamicSettings,
  }: {
    options: AlertExecutorOptions;
    uptimeESClient: UptimeESClient;
    dynamicSettings: DynamicSettings;
  }) => Promise<AlertTypeState | void>;
}

export const uptimeAlertWrapper = (uptimeAlert: UptimeAlertType) => ({
  ...uptimeAlert,
  producer: 'uptime',
  executor: async (options: AlertExecutorOptions) => {
    const {
      services: { scopedClusterClient: esClient },
    } = options;

    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
      options.services.savedObjectsClient
    );

    const uptimeESClient = createUptimeESClient({ esClient, dynamicSettings });

    return uptimeAlert.executor({ options, dynamicSettings, uptimeESClient });
  },
});
