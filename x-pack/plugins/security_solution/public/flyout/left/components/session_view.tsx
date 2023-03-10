/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { SESSION_VIEW_TEST_ID } from './test_ids';

export const SESSION_VIEW_ID = 'session_view';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  return <EuiText data-test-subj={SESSION_VIEW_TEST_ID}>{'Session view'}</EuiText>;
};

SessionView.displayName = 'SessionView';
