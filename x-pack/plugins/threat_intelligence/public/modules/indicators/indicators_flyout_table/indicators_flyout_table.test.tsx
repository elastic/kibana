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
import {
  EMPTY_PROMPT_TEST_ID,
  IndicatorsFlyoutTable,
  TABLE_TEST_ID,
} from './indicators_flyout_table';

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  value: 'value',
  feed: 'feed',
  type: 'type',
  name: 'first indicator',
  first_seen: '2022-06-03T11:41:06.000Z',
};

describe('IndicatorsFlyoutTable', () => {
  it('should render EUI components', () => {
    const wrapper = mountWithIntl(<IndicatorsFlyoutTable indicator={mockIndicator} />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
  });

  it('should render fields and values in table', () => {
    const { getByTestId, getByText } = render(<IndicatorsFlyoutTable indicator={mockIndicator} />);

    expect(getByTestId(TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByText('id')).toBeInTheDocument();
    expect(getByText('name')).toBeInTheDocument();
    expect(getByText(mockIndicator.id)).toBeInTheDocument();
    expect(getByText(mockIndicator.name)).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <IndicatorsFlyoutTable indicator={{} as unknown as Indicator} />
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
