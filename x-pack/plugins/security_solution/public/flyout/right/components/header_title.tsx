/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { HEADER_TITLE } from '../translations';

/**
 * Document details flyout right section header
 */
export const HeaderTitle: FC = memo(() => {
  return (
    <>
      <EuiTitle size="s" data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>
        <h4>{HEADER_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
