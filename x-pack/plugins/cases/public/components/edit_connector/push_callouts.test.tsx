/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { PushCallouts } from './push_callouts';

const onEditClick = jest.fn();

const defaultProps = {
  hasConnectors: false,
  hasLicenseError: false,
  errorsMsg: [{ id: 'test-id', title: 'My title', description: 'My desc' }],
  onEditClick,
};

describe('PushCallouts ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(<PushCallouts {...defaultProps} />);

    expect(await screen.findByText('My title')).toBeInTheDocument();
    expect(await screen.findByText('My desc')).toBeInTheDocument();
  });
});
