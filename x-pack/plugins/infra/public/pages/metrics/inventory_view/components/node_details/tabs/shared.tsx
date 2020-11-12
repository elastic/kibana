/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { InfraWaffleMapOptions, InfraWaffleMapNode } from '../../../../../../lib/lib';
import { euiStyled } from '../../../../../../../../observability/public';

export interface TabProps {
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
}

export const OVERLAY_Y_START = 266;
export const OVERLAY_BOTTOM_MARGIN = 16;
export const OVERLAY_HEADER_SIZE = 96;
const contentHeightOffset = OVERLAY_Y_START + OVERLAY_BOTTOM_MARGIN + OVERLAY_HEADER_SIZE;
export const TabContent = euiStyled.div`
<<<<<<< HEAD
  padding: ${(props) => props.theme.eui.paddingSizes.l};
||||||| parent of 097ff579d2c... Fix overlay sizing
=======
  padding: ${(props) => props.theme.eui.paddingSizes.s};
  height: calc(100vh - ${contentHeightOffset}px);
  overflow-y: auto;
  overflow-x: hidden;
>>>>>>> 097ff579d2c... Fix overlay sizing
`;
