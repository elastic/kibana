/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TooltipData } from './chart_tooltip_service';
import { ChartTooltipService, getChartTooltipDefaultState } from './chart_tooltip_service';

describe('ChartTooltipService', () => {
  let service: ChartTooltipService;

  beforeEach(() => {
    service = new ChartTooltipService();
  });

  test('should update the tooltip state on show and hide', () => {
    const spy = jest.fn();

    service.tooltipState$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(getChartTooltipDefaultState());

    const update = [
      {
        label: 'new tooltip',
      },
    ] as TooltipData;
    const mockEl = document.createElement('div');

    service.show(update, mockEl);

    expect(spy).toHaveBeenCalledWith({
      isTooltipVisible: true,
      tooltipData: update,
      offset: { x: 0, y: 0 },
      target: mockEl,
    });

    service.hide();

    expect(spy).toHaveBeenCalledWith({
      isTooltipVisible: false,
      tooltipData: [] as unknown as TooltipData,
      offset: { x: 0, y: 0 },
      target: null,
    });
  });

  test('update the tooltip state only on a new value', () => {
    const spy = jest.fn();

    service.tooltipState$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(getChartTooltipDefaultState());

    service.hide();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
