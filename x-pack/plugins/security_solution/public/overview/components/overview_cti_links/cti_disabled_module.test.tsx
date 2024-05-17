/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { CtiDisabledModule } from './cti_disabled_module';

describe('CtiDisabledModule', () => {
  it('renders splitPanel with "danger" variant', () => {
    render(
      <TestProviders>
        <CtiDisabledModule />
      </TestProviders>
    );

    expect(screen.getByTestId('cti-dashboard-links')).toBeInTheDocument();
    expect(screen.getByTestId('cti-inner-panel-danger')).toBeInTheDocument();
  });
});
