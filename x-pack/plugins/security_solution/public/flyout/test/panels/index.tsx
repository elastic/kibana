/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExpandableFlyoutProps } from '@kbn/expandable-flyout/src/components/expandable_flyout';
import { RightDetailsPanel, RightDetailsPanelKey } from './right';
import { Right2DetailsPanel, Right2DetailsPanelKey } from './right2';
import { LeftDetailsPanel, LeftDetailsPanelKey } from './left';
import { Left2DetailsPanel, Left2DetailsPanelKey } from './left2';
import { PreviewDetailsPanel, PreviewDetailsPanelKey } from './preview';
import { Preview2DetailsPanel, Preview2DetailsPanelKey } from './preview2';

export const expandableFlyoutPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: RightDetailsPanelKey,
    width: 500,
    component: () => <RightDetailsPanel />,
  },
  {
    key: Right2DetailsPanelKey,
    width: 500,
    component: () => <Right2DetailsPanel />,
  },
  {
    key: LeftDetailsPanelKey,
    width: 1000,
    component: () => <LeftDetailsPanel />,
  },
  {
    key: Left2DetailsPanelKey,
    width: 1000,
    component: () => <Left2DetailsPanel />,
  },
  {
    key: PreviewDetailsPanelKey,
    width: 500,
    component: () => <PreviewDetailsPanel />,
  },
  {
    key: Preview2DetailsPanelKey,
    width: 500,
    component: () => <Preview2DetailsPanel />,
  },
];
