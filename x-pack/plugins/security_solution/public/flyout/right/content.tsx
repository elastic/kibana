/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import type { VFC } from 'react';
import React, { useMemo } from 'react';
import { FLYOUT_BODY_TEST_ID } from './test_ids';
import type { RightPanelPaths } from '.';
import { tabs } from './tabs';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
}

/**
 * Document details expandable flyout right section, that will display the content
 * of the overview, table and json tabs.
 */
export const PanelContent: VFC<PanelContentProps> = ({ selectedTabId }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId]);

  return <EuiFlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>{selectedTabContent}</EuiFlyoutBody>;
};

PanelContent.displayName = 'PanelContent';
