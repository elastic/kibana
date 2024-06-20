/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FLYOUT_BODY_TEST_ID } from './test_ids';
import { OverviewTab } from './tabs/overview_tab';

import { FlyoutBody } from '../../shared/components/flyout_body';

/**
 * Document details expandable flyout right section, that will display the content
 * of the overview, table and json tabs.
 */
export const PanelContent: FC = () => {
  return (
    <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
      <OverviewTab />
    </FlyoutBody>
  );
};

PanelContent.displayName = 'PanelContent';
