/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { TooltipValue, TooltipValueFormatter } from '@elastic/charts';

export interface ChartTooltipValue extends TooltipValue {
  skipHeader?: boolean;
}

export interface TooltipHeader {
  skipHeader: boolean;
}

export type TooltipData = [TooltipHeader | TooltipValue, TooltipValue];

interface ChartTooltipState {
  isTooltipVisible: boolean;
  offset: ToolTipOffset;
  targetPosition: ClientRect;
  tooltipData: TooltipData;
  tooltipHeaderFormatter?: TooltipValueFormatter;
  tooltipPosition: { left: number; top: number };
}

interface ToolTipOffset {
  x: number;
  y: number;
}

export interface MlChartTooltipService {
  show: (tooltipData: TooltipData, target?: HTMLElement | null, offset?: ToolTipOffset) => void;
  hide: () => void;
}

export const getChartTooltipDefaultState = (): ChartTooltipState => ({
  isTooltipVisible: false,
  tooltipData: ([] as unknown) as TooltipData,
  offset: { x: 0, y: 0 },
  targetPosition: { left: 0, top: 0 } as ClientRect,
  tooltipPosition: { left: 0, top: 0 },
});

export const chartTooltip$ = new BehaviorSubject<ChartTooltipState>(getChartTooltipDefaultState());

export const mlChartTooltipService: MlChartTooltipService = {
  show: (tooltipData, target, offset = { x: 0, y: 0 }) => {
    if (typeof target !== 'undefined' && target !== null) {
      chartTooltip$.next({
        ...chartTooltip$.getValue(),
        isTooltipVisible: true,
        offset,
        targetPosition: target.getBoundingClientRect(),
        tooltipData,
      });
    }
  },
  hide: () => {
    chartTooltip$.next({
      ...getChartTooltipDefaultState(),
      isTooltipVisible: false,
    });
  },
};
