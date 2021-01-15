/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useBarCharts } from './use_bar_charts';
import { renderHook } from '@testing-library/react-hooks';
import { IWaterfallContext } from '../context/waterfall_chart';
import { CANVAS_MAX_ITEMS } from './constants';

const generateTestData = (): IWaterfallContext['data'] => {
  const numberOfItems = 1000;

  const data: IWaterfallContext['data'] = [];
  const testItem = {
    x: 0,
    y0: 0,
    y: 4.345000023022294,
    config: {
      colour: '#b9a888',
      showTooltip: true,
      tooltipProps: { value: 'Queued / Blocked: 4.345ms', colour: '#b9a888' },
    },
  };

  for (let i = 0; i < numberOfItems; i++) {
    data.push(
      {
        ...testItem,
        x: i,
      },
      {
        ...testItem,
        x: i,
        y0: 7,
        y: 25,
      }
    );
  }

  return data;
};

describe('useBarChartsHooks', () => {
  it('returns result as expected', () => {
    const { result, rerender } = renderHook((props) => useBarCharts(props), {
      initialProps: { data: [] as IWaterfallContext['data'] },
    });

    expect(result.current).toHaveLength(0);
    const newData = generateTestData();

    rerender({ data: newData });

    // Thousands items will result in 7 Canvas
    expect(result.current.length).toBe(7);

    const firstChartItems = result.current[0];
    const lastChartItems = result.current[4];

    // first chart items last item should be x 199, since we only display 150 items
    expect(firstChartItems[firstChartItems.length - 1].x).toBe(CANVAS_MAX_ITEMS - 1);

    // since here are 5 charts, last chart first item should be x 800
    expect(lastChartItems[0].x).toBe(CANVAS_MAX_ITEMS * 4);
    expect(lastChartItems[lastChartItems.length - 1].x).toBe(CANVAS_MAX_ITEMS * 5 - 1);
  });
});
