/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render } from '@testing-library/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import { Indicator, IndicatorsFlyout, SUBTITLE_TEST_ID, TITLE_TEST_ID } from './indicators_flyout';

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  value: 'value',
  feed: 'feed',
  type: 'type',
  name: 'first indicator',
  first_seen: '2022-06-03T11:41:06.000Z',
};

describe('IndicatorsFlyout', () => {
  it('should render EUI components', () => {
    const wrapper = mountWithIntl(
      <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
    );

    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
    expect(wrapper.find(EuiFlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find(EuiSpacer)).toHaveLength(3);
    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiTabs)).toHaveLength(1);
    expect(wrapper.find(EuiTab)).toHaveLength(2);
    expect(wrapper.find(EuiFlyoutBody)).toHaveLength(1);
  });

  it('should render ioc id in title and first_seen in subtitle', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${mockIndicator.id}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(
      `First seen: ${new Date(mockIndicator.first_seen).toDateString()}`
    );
  });

  it('should render N/A in on invalid indicator first_seen value', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={{} as unknown as Indicator} closeFlyout={() => {}} />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain('Indicator: N/A');
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain('First seen: N/A');
  });

  it('should render N/A in title and subtitle on invalid indicator', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout
        indicator={{ ...mockIndicator, first_seen: 'abc' } as unknown as Indicator}
        closeFlyout={() => {}}
      />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${mockIndicator.id}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain('First seen: N/A');
  });
});
