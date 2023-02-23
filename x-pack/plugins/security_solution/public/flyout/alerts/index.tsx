/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import type { RightPanelProps } from './panels/right';
import { RightPanel, RightPanelKey } from './panels/right';
import { RightPanelProvider } from './panels/right/context';

/**
 * List of all panels that will be used within the alert details expandable flyout.
 * This needs to be passed to the expandable flyout registeredPanels property.
 */
export const expandableFlyoutAlertsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: RightPanelKey,
    width: 500,
    component: (props) => (
      <RightPanelProvider {...(props as RightPanelProps).params}>
        <RightPanel path={props.path as RightPanelProps['path']} />
      </RightPanelProvider>
    ),
  },
];
