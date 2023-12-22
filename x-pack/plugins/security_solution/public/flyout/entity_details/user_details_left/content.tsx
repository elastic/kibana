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
import type { LeftPanelTabsType, UserDetailsLeftPanelTab } from './tabs';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface PanelContentProps {
  selectedTabId: UserDetailsLeftPanelTab;
  tabs: LeftPanelTabsType;
}

/**
 * User details expandable flyout left section.
 * Appears after the user clicks on the expand details button in the right section.
 */
export const PanelContent: VFC<PanelContentProps> = ({ selectedTabId, tabs }) => {
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
