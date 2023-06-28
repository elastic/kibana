/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import type { VFC } from 'react';
import React, { useMemo } from 'react';
import type { LeftPanelPaths } from '.';
import { tabs } from './tabs';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: LeftPanelPaths;
}

/**
 * Document details expandable flyout left section. Appears after the user clicks on the expand details button in the right section.
 * Will display the content of the visualize, investigation and insights tabs.
 */
export const PanelContent: VFC<PanelContentProps> = ({ selectedTabId }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId]);

  return <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>;
};

PanelContent.displayName = 'PanelContent';
