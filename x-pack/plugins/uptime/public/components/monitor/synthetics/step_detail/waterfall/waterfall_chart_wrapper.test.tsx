/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallChartWrapper } from './waterfall_chart_wrapper';
import { networkItems as mockNetworkItems } from './data_formatting.test';

describe('WaterfallChartWrapper', () => {
  it('opens flyout on sidebar click and closes on flyout close button', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <WaterfallChartWrapper total={mockNetworkItems.length} data={mockNetworkItems} />
    );

    expect(getByText(`1. ${mockNetworkItems[0].url}`)).toBeInTheDocument();
    expect(queryByText('Content type')).not.toBeInTheDocument();
    expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();

    // open flyout
    const sidebarButton = getByText(`1. ${mockNetworkItems[0].url}`);
    fireEvent.click(sidebarButton);

    // check for sample flyout items and that the flyout is focused
    waitFor(() => {
      const waterfallFlyout = getByTestId('waterfallFlyout');
      expect(waterfallFlyout).toBeInTheDocument();
      expect(document.activeElement).toBe(waterfallFlyout);
      expect(getByText('Content type')).toBeInTheDocument();
      expect(getByText(`${mockNetworkItems[0]?.mimeType}`)).toBeInTheDocument();
      // close flyout
      const closeButton = getByTestId('euiFlyoutCloseButton');
      fireEvent.click(closeButton);
    });

    /* check that sample flyout items are gone from the DOM and that focus is returned to the
     * sidebar item triggered the flyout */
    waitFor(() => {
      expect(document.activeElement).toBe(getByTestId('sidebarItem0'));
      expect(queryByText('Content type')).not.toBeInTheDocument();
      expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();
    });
  });

  it('opens flyout on sidebar click and closes on second sidebar click', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <WaterfallChartWrapper total={mockNetworkItems.length} data={mockNetworkItems} />
    );

    expect(getByText(`1. ${mockNetworkItems[0].url}`)).toBeInTheDocument();
    expect(queryByText('Content type')).not.toBeInTheDocument();
    expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();

    // open flyout
    const sidebarButton = getByText(`1. ${mockNetworkItems[0].url}`);
    fireEvent.click(sidebarButton);

    // check for sample flyout items and that the flyout is focused
    waitFor(() => {
      const waterfallFlyout = getByTestId('waterfallFlyout');
      expect(waterfallFlyout).toBeInTheDocument();
      expect(document.activeElement).toBe(waterfallFlyout);
      expect(getByText('Content type')).toBeInTheDocument();
      expect(getByText(`${mockNetworkItems[0]?.mimeType}`)).toBeInTheDocument();
    });

    fireEvent.click(sidebarButton);

    /* check that sample flyout items are gone from the DOM and that focus is returned to the
     * sidebar item triggered the flyout */
    waitFor(() => {
      expect(document.activeElement).toBe(getByTestId('sidebarItem0'));
      expect(queryByText('Content type')).not.toBeInTheDocument();
      expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();
    });
  });
});
