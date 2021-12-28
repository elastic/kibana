/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';

describe('Host Risk Flyout', () => {
  it('renders', () => {
    const { queryByTestId } = render(<HostRiskInformation />);

    expect(queryByTestId('?????')).toBeInTheDocument();
  });
});
