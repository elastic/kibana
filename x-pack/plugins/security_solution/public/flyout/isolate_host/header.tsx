/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { PANEL_HEADER_TITLE } from './translations';

/**
 * Document details expandable right section header for the isolate host panel
 */
export const PanelHeader: FC = memo(() => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h4 data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>{PANEL_HEADER_TITLE}</h4>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
});

PanelHeader.displayName = 'PanelHeader';
