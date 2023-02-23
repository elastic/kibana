/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import { css } from '@emotion/react';
import type { VFC } from 'react';
import React, { useMemo } from 'react';
import type { RightPanelPaths } from '.';
import { tabs } from './tabs';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
}

/**
 * Alert details expandable flyout right section, that will display the content
 * of the overview, table and json tabs.
 */
export const PanelContent: VFC<PanelContentProps> = ({ selectedTabId }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId]);

  return (
    <EuiFlyoutBody
      css={css`
        height: calc(100vh - 262px);
      `}
    >
      {selectedTabContent}
    </EuiFlyoutBody>
  );
};

PanelContent.displayName = 'PanelContent';
