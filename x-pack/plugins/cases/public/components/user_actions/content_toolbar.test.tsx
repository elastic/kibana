/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserActionContentToolbar } from './content_toolbar';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('../../common/navigation/hooks');
jest.mock('../../common/lib/kibana');

describe('UserActionContentToolbar ', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  it('renders', async () => {
    const res = appMockRenderer.render(
      <UserActionContentToolbar id="1">{'My children'}</UserActionContentToolbar>
    );

    res.getByTestId('copy-link-1');
    res.getByText('My children');
  });
});
