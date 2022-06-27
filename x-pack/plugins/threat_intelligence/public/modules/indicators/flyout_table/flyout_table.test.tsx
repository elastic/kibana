/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render } from '@testing-library/react';
import { EuiInMemoryTable } from '@elastic/eui';
import { Indicator } from '../indicators_flyout/indicators_flyout';
import { FlyoutTable } from './flyout_table';

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  name: 'first indicator',
  last_seen: '2022-06-03T11:41:06.000Z',
  first_seen: '2022-06-03T11:41:06.000Z',
};

describe('FlyoutTable', () => {
  it('Verify EUI components are present', () => {
    const wrapper = mountWithIntl(<FlyoutTable indicator={mockIndicator} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
  });

  it('Verify the table shows some indicator fields and values', () => {
    const { getByTestId, getByText } = render(<FlyoutTable indicator={mockIndicator} />);

    expect(getByTestId('tiFlyoutTableMemoryTable')).toBeInTheDocument();
    expect(getByText('id')).toBeInTheDocument();
    expect(getByText('name')).toBeInTheDocument();
    expect(getByText(mockIndicator.id)).toBeInTheDocument();
    expect(getByText(mockIndicator.name)).toBeInTheDocument();
  });

  it('Verify the error messages show up on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <FlyoutTable indicator={{} as unknown as Indicator} />
    );

    expect(getByTestId('tiFlyoutTableEmptyPrompt')).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
