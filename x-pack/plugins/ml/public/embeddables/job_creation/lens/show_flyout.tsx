/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable } from '@kbn/lens-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { createFlyout } from '../common/create_flyout';
import { LensLayerSelectionFlyout } from './lens_vis_layer_selection_flyout';

export async function showLensVisToADJobFlyout(
  embeddable: Embeddable,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  lens: LensPublicStart
): Promise<void> {
  return createFlyout(LensLayerSelectionFlyout, embeddable, coreStart, share, data, lens);
}
