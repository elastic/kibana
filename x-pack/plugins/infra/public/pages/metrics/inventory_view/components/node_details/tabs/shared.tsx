/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiStyled } from '../../../../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import type { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../../lib/lib';

export interface TabProps {
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
  onClose(): void;
}

export const OVERLAY_Y_START = 266;
export const OVERLAY_BOTTOM_MARGIN = 16;
export const TabContent = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.m};
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;
