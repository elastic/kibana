/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallChartWrapper } from './waterfall_chart_wrapper';
import { networkItems as mockNetworkItems } from './data_formatting.test';

import { extractItems, isHighlightedItem } from './data_formatting';
import { BAR_HEIGHT } from '../../waterfall/components/constants';
import { MimeType } from './types';
import {
  FILTER_POPOVER_OPEN_LABEL,
  FILTER_REQUESTS_LABEL,
  FILTER_COLLAPSE_REQUESTS_LABEL,
} from '../../waterfall/components/translations';

const getHighLightedItems = (query: string, filters: string[]) => {
  return NETWORK_EVENTS.events.filter((item) => isHighlightedItem(item, query, filters));
};

describe('WaterfallChartWrapper', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('renders the correct sidebar items', () => {
    const { getAllByTestId } = render(
      <WaterfallChartWrapper
        data={extractItems(NETWORK_EVENTS.events)}
        total={1000}
        markerItems={[{ id: 'domContentLoaded', offset: 2352353 }]}
      />
    );

    const sideBarItems = getAllByTestId('middleTruncatedTextSROnly');

    expect(sideBarItems).toHaveLength(5);
  });

  it('search by query works', () => {
    const { getAllByTestId, getByTestId, getByLabelText } = render(
      <WaterfallChartWrapper data={extractItems(NETWORK_EVENTS.events)} total={1000} />
    );

    const filterInput = getByLabelText(FILTER_REQUESTS_LABEL);

    const searchText = '.js';

    fireEvent.change(filterInput, { target: { value: searchText } });

    // inout has debounce effect so hence the timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const highlightedItemsLength = getHighLightedItems(searchText, []).length;
    expect(getAllByTestId('sideBarHighlightedItem')).toHaveLength(highlightedItemsLength);

    expect(getAllByTestId('sideBarDimmedItem')).toHaveLength(
      NETWORK_EVENTS.events.length - highlightedItemsLength
    );

    const SIDE_BAR_ITEMS_HEIGHT = NETWORK_EVENTS.events.length * BAR_HEIGHT;
    expect(getByTestId('wfSidebarContainer')).toHaveAttribute('height', `${SIDE_BAR_ITEMS_HEIGHT}`);

    expect(getByTestId('wfDataOnlyBarChart')).toHaveAttribute('height', `${SIDE_BAR_ITEMS_HEIGHT}`);
  });

  it('search by mime type works', () => {
    const { getAllByTestId, getByLabelText, getAllByText } = render(
      <WaterfallChartWrapper data={extractItems(NETWORK_EVENTS.events)} total={1000} />
    );

    const sideBarItems = getAllByTestId('middleTruncatedTextSROnly');

    expect(sideBarItems).toHaveLength(5);

    fireEvent.click(getByLabelText(FILTER_POPOVER_OPEN_LABEL));

    fireEvent.click(getAllByText('XHR')[1]);

    // inout has debounce effect so hence the timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const highlightedItemsLength = getHighLightedItems('', [MimeType.XHR]).length;

    expect(getAllByTestId('sideBarHighlightedItem')).toHaveLength(highlightedItemsLength);
    expect(getAllByTestId('sideBarDimmedItem')).toHaveLength(
      NETWORK_EVENTS.events.length - highlightedItemsLength
    );
  });

  it('renders sidebar even when filter matches 0 resources', () => {
    const { getAllByTestId, getByLabelText, getAllByText, queryAllByTestId } = render(
      <WaterfallChartWrapper data={extractItems(NETWORK_EVENTS.events)} total={1000} />
    );

    const sideBarItems = getAllByTestId('middleTruncatedTextSROnly');

    expect(sideBarItems).toHaveLength(5);

    fireEvent.click(getByLabelText(FILTER_POPOVER_OPEN_LABEL));

    fireEvent.click(getAllByText('CSS')[1]);

    // inout has debounce effect so hence the timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const highlightedItemsLength = getHighLightedItems('', [MimeType.Stylesheet]).length;

    // no CSS items found
    expect(queryAllByTestId('sideBarHighlightedItem')).toHaveLength(0);
    expect(getAllByTestId('sideBarDimmedItem')).toHaveLength(
      NETWORK_EVENTS.events.length - highlightedItemsLength
    );

    fireEvent.click(getByLabelText(FILTER_COLLAPSE_REQUESTS_LABEL));

    // filter bar is still accessible even when no resources match filter
    expect(getByLabelText(FILTER_REQUESTS_LABEL)).toBeInTheDocument();

    // no resources items are in the chart as none match filter
    expect(queryAllByTestId('sideBarHighlightedItem')).toHaveLength(0);
    expect(queryAllByTestId('sideBarDimmedItem')).toHaveLength(0);
  });

  it('opens flyout on sidebar click and closes on flyout close button', async () => {
    const { getByText, getByTestId, queryByText, getByRole } = render(
      <WaterfallChartWrapper total={mockNetworkItems.length} data={mockNetworkItems} />
    );

    expect(getByText(`${mockNetworkItems[0].url}`)).toBeInTheDocument();
    expect(getByText(`1.`)).toBeInTheDocument();
    expect(queryByText('Content type')).not.toBeInTheDocument();
    expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();

    // open flyout
    // selector matches both button and accessible text. Button is the second element in the array;
    const sidebarButton = getByTestId(`middleTruncatedTextButton1`);
    fireEvent.click(sidebarButton);

    // check for sample flyout items
    await waitFor(() => {
      const waterfallFlyout = getByRole('dialog');
      expect(waterfallFlyout).toBeInTheDocument();
      expect(getByText('Content type')).toBeInTheDocument();
      expect(getByText(`${mockNetworkItems[0]?.mimeType}`)).toBeInTheDocument();
      // close flyout
      const closeButton = getByTestId('euiFlyoutCloseButton');
      fireEvent.click(closeButton);
    });

    /* check that sample flyout items are gone from the DOM */
    await waitFor(() => {
      expect(queryByText('Content type')).not.toBeInTheDocument();
      expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();
    });
  });

  it('opens flyout on sidebar click and closes on second sidebar click', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <WaterfallChartWrapper total={mockNetworkItems.length} data={mockNetworkItems} />
    );

    expect(getByText(`${mockNetworkItems[0].url}`)).toBeInTheDocument();
    expect(getByText(`1.`)).toBeInTheDocument();
    expect(queryByText('Content type')).not.toBeInTheDocument();
    expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();

    // open flyout
    // selector matches both button and accessible text. Button is the second element in the array;
    const sidebarButton = getByTestId(`middleTruncatedTextButton1`);
    fireEvent.click(sidebarButton);

    // check for sample flyout items and that the flyout is focused
    await waitFor(() => {
      const waterfallFlyout = getByTestId('waterfallFlyout');
      expect(waterfallFlyout).toBeInTheDocument();
      expect(getByText('Content type')).toBeInTheDocument();
      expect(getByText(`${mockNetworkItems[0]?.mimeType}`)).toBeInTheDocument();
    });

    fireEvent.click(sidebarButton);

    /* check that sample flyout items are gone from the DOM */
    await waitFor(() => {
      expect(queryByText('Content type')).not.toBeInTheDocument();
      expect(queryByText(`${mockNetworkItems[0]?.mimeType}`)).not.toBeInTheDocument();
    });
  });
});

const NETWORK_EVENTS = {
  events: [
    {
      timestamp: '2021-01-21T10:31:21.537Z',
      method: 'GET',
      url: 'https://apv-static.minute.ly/videos/v-c2a526c7-450d-428e-1244649-a390-fb639ffead96-s45.746-54.421m.mp4',
      status: 206,
      mimeType: 'video/mp4',
      requestSentTime: 241114127.474,
      loadEndTime: 241116573.402,
      timings: {
        total: 2445.928000001004,
        queueing: 1.7399999778717756,
        blocked: 0.391999987186864,
        receive: 2283.964000031119,
        connect: 91.5709999972023,
        wait: 28.795999998692423,
        proxy: -1,
        dns: 36.952000024029985,
        send: 0.10000000474974513,
        ssl: 64.28900000173599,
      },
    },
    {
      timestamp: '2021-01-21T10:31:22.174Z',
      method: 'GET',
      url: 'https://dpm.demdex.net/ibs:dpid=73426&dpuuid=31597189268188866891125449924942215949',
      status: 200,
      mimeType: 'image/gif',
      requestSentTime: 241114749.202,
      loadEndTime: 241114805.541,
      timings: {
        queueing: 1.2240000069141388,
        receive: 2.218999987235293,
        proxy: -1,
        dns: -1,
        send: 0.14200000441633165,
        blocked: 1.033000007737428,
        total: 56.33900000248104,
        wait: 51.72099999617785,
        ssl: -1,
        connect: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.679Z',
      method: 'GET',
      url: 'https://dapi.cms.mlbinfra.com/v2/content/en-us/sel-t119-homepage-mediawall',
      status: 200,
      mimeType: 'application/json',
      requestSentTime: 241114268.04299998,
      loadEndTime: 241114665.609,
      timings: {
        total: 397.5659999996424,
        dns: 29.5429999823682,
        wait: 221.6830000106711,
        queueing: 2.1410000044852495,
        connect: 106.95499999565072,
        ssl: 69.06899999012239,
        receive: 2.027999988058582,
        blocked: 0.877000013133511,
        send: 23.719999997410923,
        proxy: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.740Z',
      method: 'GET',
      url: 'https://platform.twitter.com/embed/embed.runtime.b313577971db9c857801.js',
      status: 200,
      mimeType: 'application/javascript',
      requestSentTime: 241114303.84899998,
      loadEndTime: 241114370.361,
      timings: {
        send: 1.357000001007691,
        wait: 40.12299998430535,
        receive: 16.78500001435168,
        ssl: -1,
        queueing: 2.5670000177342445,
        total: 66.51200001942925,
        connect: -1,
        blocked: 5.680000002030283,
        proxy: -1,
        dns: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.740Z',
      method: 'GET',
      url: 'https://platform.twitter.com/embed/embed.modules.7a266e7acfd42f2581a5.js',
      status: 200,
      mimeType: 'application/javascript',
      requestSentTime: 241114305.939,
      loadEndTime: 241114938.264,
      timings: {
        wait: 51.61500000394881,
        dns: -1,
        ssl: -1,
        receive: 506.5750000067055,
        proxy: -1,
        connect: -1,
        blocked: 69.51599998865277,
        queueing: 4.453999979887158,
        total: 632.324999984121,
        send: 0.16500000492669642,
      },
    },
  ],
};
