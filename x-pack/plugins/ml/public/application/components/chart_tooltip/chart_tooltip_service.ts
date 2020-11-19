/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { isEqual } from 'lodash';
import { TooltipValue, TooltipValueFormatter } from '@elastic/charts';
import { distinctUntilChanged } from 'rxjs/operators';

export interface ChartTooltipValue extends TooltipValue {
  skipHeader?: boolean;
}

export interface TooltipHeader {
  skipHeader: boolean;
}

export type TooltipData = ChartTooltipValue[];

export interface ChartTooltipState {
  isTooltipVisible: boolean;
  offset: TooltipOffset;
  tooltipData: TooltipData;
  tooltipHeaderFormatter?: TooltipValueFormatter;
  target: HTMLElement | null;
}

interface TooltipOffset {
  x: number;
  y: number;
}

export const getChartTooltipDefaultState = (): ChartTooltipState => ({
  isTooltipVisible: false,
  tooltipData: ([] as unknown) as TooltipData,
  offset: { x: 0, y: 0 },
  target: null,
});

export class ChartTooltipService {
  private chartTooltip$ = new BehaviorSubject<ChartTooltipState>(getChartTooltipDefaultState());

  public tooltipState$: Observable<ChartTooltipState> = this.chartTooltip$
    .asObservable()
    .pipe(distinctUntilChanged(isEqual));

  public show(
    tooltipData: TooltipData,
    target: HTMLElement,
    offset: TooltipOffset = { x: 0, y: 0 }
  ) {
    if (!target) {
      throw new Error('target is required for the tooltip positioning');
    }

    this.chartTooltip$.next({
      ...this.chartTooltip$.getValue(),
      isTooltipVisible: true,
      offset,
      tooltipData,
      target,
    });
  }

  public hide() {
    this.chartTooltip$.next({
      ...getChartTooltipDefaultState(),
      isTooltipVisible: false,
    });
  }
}
