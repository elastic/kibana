/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FlyoutBody } from '@kbn/security-solution-common';
import type { LeftPanelPaths } from '.';
import type { LeftPanelTabType } from './tabs';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: LeftPanelPaths;
  /**
   * Tabs display at the top of left panel
   */
  tabs: LeftPanelTabType[];
}

/**
 * Document details expandable flyout left section. Appears after the user clicks on the expand details button in the right section.
 * Displays the content of investigation and insights tabs (visualize is hidden for 8.9).
 */
export const PanelContent: FC<PanelContentProps> = ({ selectedTabId, tabs }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <FlyoutBody
      css={css`
        background-color: ${useEuiBackgroundColor('subdued')};
      `}
    >
      {selectedTabContent}
    </FlyoutBody>
  );
};

PanelContent.displayName = 'PanelContent';
