/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LocatorPublic } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import { uptimeOverviewNavigatorParams } from './overview';
import { monitorDetailNavigatorParams } from './monitor_detail';
import { editMonitorNavigatorParams } from './edit_monitor';
import { syntheticsSettingsNavigatorParams } from './settings';

export const locators: Array<Pick<LocatorPublic<SerializableRecord>, 'id' | 'getLocation'>> = [
  uptimeOverviewNavigatorParams,
  monitorDetailNavigatorParams,
  editMonitorNavigatorParams,
  syntheticsSettingsNavigatorParams,
];
