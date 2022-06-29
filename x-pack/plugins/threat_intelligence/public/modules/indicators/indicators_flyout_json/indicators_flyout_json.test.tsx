/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render } from '@testing-library/react';
import { EuiCodeBlock } from '@elastic/eui';
import { Indicator } from '../indicators_flyout/indicators_flyout';
import {
  CODE_BLOCK_TEST_ID,
  EMPTY_PROMPT_TEST_ID,
  IndicatorsFlyoutJson,
} from './indicators_flyout_json';

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  value: 'value',
  feed: 'feed',
  type: 'type',
  name: 'first indicator',
  first_seen: '2022-06-03T11:41:06.000Z',
};

describe('IndicatorsFlyoutJson', () => {
  it('should render EUI components', () => {
    const wrapper = mountWithIntl(<IndicatorsFlyoutJson indicator={mockIndicator} />);

    expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
  });

  it('should render code block component on valid indicator', () => {
    const { getByTestId } = render(<IndicatorsFlyoutJson indicator={mockIndicator} />);

    expect(getByTestId(CODE_BLOCK_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <IndicatorsFlyoutJson indicator={{} as unknown as Indicator} />
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
