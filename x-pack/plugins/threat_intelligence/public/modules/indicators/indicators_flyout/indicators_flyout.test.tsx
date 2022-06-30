/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsFlyout, SUBTITLE_TEST_ID, TITLE_TEST_ID } from './indicators_flyout';
import { generateMockIndicator, Indicator } from '../../../../common/types/Indicator';

const mockIndicator = generateMockIndicator();

describe('IndicatorsFlyout', () => {
  it('should render ioc id in title and first_seen in subtitle', () => {
    const { getByTestId } = render(
      <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
    );

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${mockIndicator.value}`);
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

    expect(getByTestId(TITLE_TEST_ID).innerHTML).toContain(`Indicator: ${mockIndicator.value}`);
    expect(getByTestId(SUBTITLE_TEST_ID).innerHTML).toContain('First seen: N/A');
  });
});
