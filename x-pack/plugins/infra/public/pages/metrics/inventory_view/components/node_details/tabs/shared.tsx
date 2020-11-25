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

export const TabContent = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;
