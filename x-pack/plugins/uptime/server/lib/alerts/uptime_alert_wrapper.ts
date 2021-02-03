/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  AlertExecutorOptions,
  AlertInstanceState,
  AlertInstanceContext,
} from '../../../../alerts/server';
import { savedObjectsAdapter } from '../saved_objects';
import { DynamicSettings } from '../../../common/runtime_types';
import { createUptimeESClient, UptimeESClient } from '../lib';
import { UptimeAlertTypeFactory, UptimeAlertTypeParam, UptimeAlertTypeState } from './types';

export interface UptimeAlertType<ActionGroupIds extends string>
  extends Omit<ReturnType<UptimeAlertTypeFactory<ActionGroupIds>>, 'executor' | 'producer'> {
  executor: ({
    options,
    uptimeEsClient,
    dynamicSettings,
  }: {
    options: AlertExecutorOptions<
      UptimeAlertTypeParam,
      UptimeAlertTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      ActionGroupIds
    >;
    uptimeEsClient: UptimeESClient;
    dynamicSettings: DynamicSettings;
    savedObjectsClient: SavedObjectsClientContract;
  }) => Promise<UptimeAlertTypeState | void>;
}

export const uptimeAlertWrapper = <ActionGroupIds extends string>(
  uptimeAlert: UptimeAlertType<ActionGroupIds>
) => ({
  ...uptimeAlert,
  producer: 'uptime',
  executor: async (
    options: AlertExecutorOptions<
      UptimeAlertTypeParam,
      UptimeAlertTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      ActionGroupIds
    >
  ) => {
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
