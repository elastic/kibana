/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { PlatinumLicenseCallout } from './platinum_callout';

describe('PlatinumLicenseCallout ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', () => {
    const result = appMockRender.render(<PlatinumLicenseCallout />);

    expect(result.getByTestId('case-callout-license-info')).toBeInTheDocument();
    expect(result.getByText('Upgrade to an appropriate license')).toBeInTheDocument();
  });
});
