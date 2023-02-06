/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CaseCallouts } from './case_callouts';

describe('CaseCallouts ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', () => {
    const result = appMockRender.render(<CaseCallouts />);
    expect(result.getByTestId('case-callouts')).toBeInTheDocument();
  });

  it('shows the platinum license callout if the user has less than platinum license', () => {
    const result = appMockRender.render(<CaseCallouts />);
    expect(result.getByTestId('case-callout-license-info')).toBeInTheDocument();
  });

  it('does not show the platinum license callout if the user has platinum license', () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });
    const result = appMockRender.render(<CaseCallouts />);

    expect(result.queryByTestId('case-callout-license-info')).toBeNull();
  });
});
