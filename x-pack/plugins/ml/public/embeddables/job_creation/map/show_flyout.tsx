/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FC } from 'react';
import React from 'react';
import { type FlyoutComponentProps, createFlyout } from '../common/create_flyout';
import { GeoJobFlyout } from './flyout';

export async function showMapVisToADJobFlyout(
  embeddable: MapApi,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  dashboardService: DashboardStart
): Promise<void> {
  const Comp: FC<FlyoutComponentProps> = ({ onClose }) => (
    <GeoJobFlyout embeddable={embeddable} onClose={onClose} />
  );
  return createFlyout(Comp, coreStart, share, data, dashboardService);
}
