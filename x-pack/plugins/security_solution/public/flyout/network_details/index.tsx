/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { PanelFooter } from './footer';
import type { FlowTargetSourceDest } from '../../../common/search_strategy';
import { PanelHeader } from './header';
import { PanelContent } from './content';

export interface NetworkExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'network-details';
  params: NetworkPanelProps;
}

export const NetworkPanelKey: NetworkExpandableFlyoutProps['key'] = 'network-details';

export interface NetworkPanelProps extends Record<string, unknown> {
  contextID: string;
  expandedNetwork: { ip: string; flowTarget: FlowTargetSourceDest };
}

/**
 *
 */
export const NetworkPanel = memo(({ contextID, expandedNetwork }: NetworkPanelProps) => {
  return (
    <>
      <PanelHeader expandedNetwork={expandedNetwork} />
      <PanelContent contextID={contextID} expandedNetwork={expandedNetwork} />
      <PanelFooter expandedNetwork={expandedNetwork} />
    </>
  );
});

NetworkPanel.displayName = 'NetworkPanel';
