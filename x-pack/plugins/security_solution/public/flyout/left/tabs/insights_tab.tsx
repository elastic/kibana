/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { INSIGHTS_TAB_CONTENT_TEST_ID } from './test_ids';

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const InsightsTab: FC = memo(() => {
  return <EuiText data-test-subj={INSIGHTS_TAB_CONTENT_TEST_ID}>{'Insights'}</EuiText>;
});

InsightsTab.displayName = 'InsightsTab';
