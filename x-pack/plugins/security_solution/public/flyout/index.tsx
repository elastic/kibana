/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import type { RightPanelProps } from './right';
import { RightPanel, RightPanelKey } from './right';
import { RightPanelProvider } from './right/context';
import type { LeftPanelProps } from './left';
import { LeftPanel, LeftPanelKey } from './left';
import { LeftPanelProvider } from './left/context';

// TODO these should be replaced by a more dynamic solution
//  see https://github.com/elastic/security-team/issues/6247
export const RIGHT_SECTION_WIDTH = 500;
export const LEFT_SECTION_WIDTH = 1000;

/**
 * List of all panels that will be used within the document details expandable flyout.
 * This needs to be passed to the expandable flyout registeredPanels property.
 */
export const expandableFlyoutDocumentsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: RightPanelKey,
    width: RIGHT_SECTION_WIDTH,
    component: (props) => (
      <RightPanelProvider {...(props as RightPanelProps).params}>
        <RightPanel path={props.path as RightPanelProps['path']} />
      </RightPanelProvider>
    ),
  },
  {
    key: LeftPanelKey,
    width: LEFT_SECTION_WIDTH,
    component: (props) => (
      <LeftPanelProvider {...(props as LeftPanelProps).params}>
        <LeftPanel path={props.path as LeftPanelProps['path']} />
      </LeftPanelProvider>
    ),
  },
];
