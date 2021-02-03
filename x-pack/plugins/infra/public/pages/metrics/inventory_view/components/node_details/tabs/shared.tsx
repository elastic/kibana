/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { InfraWaffleMapOptions, InfraWaffleMapNode } from '../../../../../../lib/lib';
import { euiStyled } from '../../../../../../../../../../src/plugins/kibana_react/common';

export interface TabProps {
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
}

export const OVERLAY_Y_START = 266;
export const OVERLAY_BOTTOM_MARGIN = 16;
export const TabContent = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.m};
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;
