/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { IndicatorsFlyout, SUBTITLE_TEST_ID, TITLE_TEST_ID } from '.';
import { generateMockIndicator, Indicator } from '../../types';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

const mockIndicator = generateMockIndicator();

describe('<IndicatorsFlyout />', () => {
  beforeEach(() => {
    render(
      <TestProvidersComponent>
        <IndicatorsFlyout indicator={mockIndicator} closeFlyout={() => {}} />
      </TestProvidersComponent>
    );
  });

  it('should render all the tab switches', () => {
    expect(screen.queryByTestId('tiIndicatorFlyoutTabs')).toBeInTheDocument();

    const switchElement = screen.getByTestId('tiIndicatorFlyoutTabs');

    expect(switchElement).toHaveTextContent(/Overview/);
    expect(switchElement).toHaveTextContent(/Table/);
    expect(switchElement).toHaveTextContent(/JSON/);
  });

  describe('title and subtitle', () => {
    describe('valid indicator', () => {
      it('should render correct title and subtitle', async () => {
        expect(screen.getByTestId(TITLE_TEST_ID)).toHaveTextContent('Indicator details');
      });
    });

    describe('invalid indicator', () => {
      beforeEach(() => {
        cleanup();

        render(
          <TestProvidersComponent>
            <IndicatorsFlyout
              indicator={{ fields: {} } as unknown as Indicator}
              closeFlyout={() => {}}
            />
          </TestProvidersComponent>
        );
      });

      it('should render correct labels', () => {
        expect(screen.getByTestId(TITLE_TEST_ID)).toHaveTextContent('Indicator details');
        expect(screen.getByTestId(SUBTITLE_TEST_ID)).toHaveTextContent('First seen: -');
      });
    });
  });
});
