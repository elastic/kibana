/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { EventPanelPaths } from '../../../../common/store/flyout/model';
import { eventTabs } from './tabs';

export const EventTabbedContent = ({ selectedTabId }: { selectedTabId: EventPanelPaths }) => {
  const selectedTabContent = useMemo(() => {
    return eventTabs.find((obj) => obj.id === selectedTabId)?.content;
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
