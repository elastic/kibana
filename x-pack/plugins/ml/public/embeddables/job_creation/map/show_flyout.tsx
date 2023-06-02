/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';

import { GeoJobFlyout } from './flyout';
import { createFlyout } from '../common/create_flyout';

export async function showMapVisToADJobFlyout(
  embeddable: MapEmbeddable,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart
): Promise<void> {
  return createFlyout(GeoJobFlyout, embeddable, coreStart, share, data);
}
