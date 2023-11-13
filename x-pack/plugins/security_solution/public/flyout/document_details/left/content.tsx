/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor } from '@elastic/eui';
import type { VFC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { LeftPanelPaths } from '.';
import { tabs } from './tabs';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface PanelContentProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: LeftPanelPaths;
}

/**
 * Document details expandable flyout left section. Appears after the user clicks on the expand details button in the right section.
 * Displays the content of investigation and insights tabs (visualize is hidden for 8.9).
 */
export const PanelContent: VFC<PanelContentProps> = ({ selectedTabId }) => {
  const selectedTabContent = useMemo(() => {
    return tabs.filter((tab) => tab.visible).find((tab) => tab.id === selectedTabId)?.content;
  }, [selectedTabId]);

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
