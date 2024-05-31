/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../rtl_helpers';
import { ChartCreationInfo } from './chart_creation_info';

const info = {
  to: 1634071132571,
  from: 1633406400000,
  lastUpdated: 1634071140788,
};

describe('ChartCreationInfo', () => {
  it('renders chart creation info', async () => {
    render(<ChartCreationInfo {...info} />);

    expect(screen.getByText('Chart created')).toBeInTheDocument();
    expect(screen.getByText('Oct 12, 2021 4:39 PM')).toBeInTheDocument();
    expect(screen.getByText('Displaying from')).toBeInTheDocument();
    expect(screen.getByText('Oct 5, 2021 12:00 AM → Oct 12, 2021 4:38 PM')).toBeInTheDocument();
  });

  it('does not display info when props are falsey', async () => {
    render(<ChartCreationInfo />);

    expect(screen.queryByText('Chart created')).not.toBeInTheDocument();
    expect(screen.queryByText('Displaying from')).not.toBeInTheDocument();
  });
});
