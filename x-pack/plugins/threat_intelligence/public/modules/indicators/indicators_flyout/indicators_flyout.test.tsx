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
import { Indicator, IndicatorsFlyout } from './indicators_flyout';

const mockIndicator: Indicator = {
  id: '12.68.554.87',
  name: 'first indicator',
  last_seen: '2022-06-03T11:41:06.000Z',
  first_seen: '2022-06-03T11:41:06.000Z',
};

describe('DetailedIOCFlyout', () => {
  it('Verify EUI components are present', () => {
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

  it('Verify the title and subtitle', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
    );

    expect(getByTestId('tiIndicatorFlyoutTitle').innerHTML).toContain(
      `Indicator: ${mockIndicator.id}`
    );
    expect(getByTestId('tiIndicatorFlyoutSubtitle').innerHTML).toContain(
      `First seen: ${mockIndicator.first_seen}`
    );
  });

  it('Verify N/A is shown when indicator isn t properly formatted', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={{} as unknown as Indicator} closeFlyout={() => {}} />
    );

    expect(getByTestId('tiIndicatorFlyoutTitle').innerHTML).toContain('Indicator: N/A');
    expect(getByTestId('tiIndicatorFlyoutSubtitle').innerHTML).toContain('First seen: N/A');
  });
});
