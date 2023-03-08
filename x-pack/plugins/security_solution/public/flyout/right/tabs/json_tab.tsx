/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { JSON_TAB_CONTENT_TEST_ID } from './test_ids';

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab: FC = memo(() => {
  return <EuiText data-test-subj={JSON_TAB_CONTENT_TEST_ID}>{'Json tab'}</EuiText>;
});

JsonTab.displayName = 'JsonTab';
