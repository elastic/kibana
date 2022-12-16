/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallTooltipContent } from './waterfall_tooltip_content';

jest.mock('../context/waterfall_chart', () => ({
  useWaterfallContext: jest.fn().mockReturnValue({
    data: [
      {
        x: 0,
        config: {
          url: 'https://www.elastic.co',
          tooltipProps: {
            colour: '#000000',
            value: 'test-val',
          },
          showTooltip: true,
        },
      },
      {
        x: 0,
        config: {
          url: 'https://www.elastic.co/with/missing/tooltip.props',
          showTooltip: true,
        },
      },
      {
        x: 1,
        config: {
          url: 'https://www.elastic.co/someresource.path',
          tooltipProps: {
            colour: '#010000',
            value: 'test-val-missing',
          },
          showTooltip: true,
        },
      },
    ],
    renderTooltipItem: (props: any) => (
      <div aria-label="tooltip item">
        <div>{props.colour}</div>
        <div>{props.value}</div>
      </div>
    ),
    sidebarItems: [
      {
        isHighlighted: true,
        index: 0,
        offsetIndex: 1,
        url: 'https://www.elastic.co',
        status: 200,
        method: 'GET',
      },
    ],
  }),
}));

describe('WaterfallTooltipContent', () => {
  it('renders tooltip', () => {
    const { getByText, queryByText } = render(
      <WaterfallTooltipContent text="1. https://www.elastic.co" url="https://www.elastic.co" />
    );
    expect(getByText('#000000')).toBeInTheDocument();
    expect(getByText('test-val')).toBeInTheDocument();
    expect(getByText('1. https://www.elastic.co')).toBeInTheDocument();
    expect(queryByText('#010000')).toBeNull();
    expect(queryByText('test-val-missing')).toBeNull();
  });

  it(`doesn't render metric if tooltip props missing`, () => {
    const { getAllByLabelText, getByText } = render(
      <WaterfallTooltipContent text="1. https://www.elastic.co" url="https://www.elastic.co" />
    );
    const metricElements = getAllByLabelText('tooltip item');
    expect(metricElements).toHaveLength(1);
    expect(getByText('test-val')).toBeInTheDocument();
  });
});
