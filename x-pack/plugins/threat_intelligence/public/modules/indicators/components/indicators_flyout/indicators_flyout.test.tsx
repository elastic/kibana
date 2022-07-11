/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsFlyout, SUBTITLE_TEST_ID, TITLE_TEST_ID } from './indicators_flyout';
import { generateMockIndicator, RawIndicatorFieldId } from '../../../../../common/types/Indicator';
import { unwrapValue } from '../../lib/unwrap_value';
import { displayValue } from '../../lib/display_value';
import { EMPTY_VALUE } from '../../../../../common/constants';

const mockIndicator = generateMockIndicator();

describe('IndicatorsFlyout', () => {
  it('should render ioc id in title and first_seen in subtitle', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(
      `Indicator: ${displayValue(mockIndicator)}`
    );
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(
      `First seen: ${new Date(
        unwrapValue(mockIndicator, RawIndicatorFieldId.FirstSeen) as string
      ).toDateString()}`
    );
  });

  it(`should render ${EMPTY_VALUE} in on invalid indicator first_seen value`, () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={{ fields: {} }} closeFlyout={() => {}} />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${EMPTY_VALUE}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(`First seen: ${EMPTY_VALUE}`);
  });

  it(`should render ${EMPTY_VALUE} in title and subtitle on invalid indicator`, () => {
    const { getByTestId } = render(
      <IndicatorsFlyout
        indicator={{ fields: { 'threat.indicator.first_seen': ['abc'] } }}
        closeFlyout={() => {}}
      />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${EMPTY_VALUE}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain(`First seen: ${EMPTY_VALUE}`);
  });
});
