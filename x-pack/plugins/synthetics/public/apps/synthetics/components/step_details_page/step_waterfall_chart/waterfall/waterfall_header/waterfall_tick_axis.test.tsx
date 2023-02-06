/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { render } from '../../../../../utils/testing';
import { WaterfallTickAxis } from './waterfall_tick_axis';

describe('WaterfallChartWrapper', () => {
  const setOnlyHighlightedMock = jest.fn();
  const defaultProps = {
    showOnlyHighlightedNetworkRequests: false,
    setOnlyHighlighted: setOnlyHighlightedMock,
    highlightedNetworkRequests: 10,
    fetchedNetworkRequests: 20,
    shouldRenderSidebar: true,
    barStyleAccessor: ({ datum }: { datum: { config: { colour: string } } }) => ({
      rect: {
        fill: datum.config?.colour,
        opacity: 0.1,
      },
    }),
    domain: { min: 0, max: 1 },
    tickFormat: (d: number) => `${Number(d).toFixed(0)} ms`,
  };

  it('renders correctly', () => {
    const { getByTestId } = render(<WaterfallTickAxis {...defaultProps} />);

    expect(getByTestId('syntheticsWaterfallHideNonMatching')).toBeInTheDocument();
  });

  it('updates "Hide nonmatching" status', () => {
    const { getByTestId } = render(<WaterfallTickAxis {...defaultProps} />);

    fireEvent.click(getByTestId('syntheticsWaterfallHideNonMatching'));
    expect(setOnlyHighlightedMock).toHaveBeenCalledWith(true);

    fireEvent.click(getByTestId('syntheticsWaterfallHideNonMatching'));

    waitFor(() => {
      expect(setOnlyHighlightedMock).toHaveBeenCalledWith(false);
    });
  });
});
