/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import moment from 'moment-timezone';
import { TransformListRow } from '../../../../common';
import { ExpandedRow } from './expanded_row';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';
import { within } from '@testing-library/dom';

jest.mock('../../../../../shared_imports', () => ({
  formatHumanReadableDateTimeSeconds: jest.fn(),
}));
describe('Transform: Transform List <ExpandedRow />', () => {
  // Set timezone to US/Eastern for consistent test results.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Minimal initialization', async () => {
    const item: TransformListRow = transformListRow;

    const { getByText, getByTestId } = render(<ExpandedRow item={item} />);

    expect(getByText('Details')).toBeInTheDocument();
    expect(getByText('Stats')).toBeInTheDocument();
    expect(getByText('JSON')).toBeInTheDocument();
    expect(getByText('Messages')).toBeInTheDocument();
    expect(getByText('Preview')).toBeInTheDocument();

    const tabContent = getByTestId('transformDetailsTabContent');
    expect(tabContent).toBeInTheDocument();

    expect(getByTestId('transformDetailsTab')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabContent).getByText('General')).toBeInTheDocument();

    fireEvent.click(getByTestId('transformStatsTab'));
    expect(getByTestId('transformStatsTab')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabContent).getByText('Stats')).toBeInTheDocument();
  });
});
