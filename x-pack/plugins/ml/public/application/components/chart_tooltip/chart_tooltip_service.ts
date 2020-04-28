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

interface TooltipPosition {
  left: number;
  top: number;
}

export interface ChartTooltipState {
  isTooltipVisible: boolean;
  offset: TooltipOffset;
  targetPosition: ClientRect;
  tooltipData: TooltipData;
  tooltipHeaderFormatter?: TooltipValueFormatter;
  tooltipPosition: TooltipPosition;
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
  targetPosition: { left: 0, top: 0 } as ClientRect,
  tooltipPosition: { left: 0, top: 0 },
  target: null,
});

export class ChartTooltipService {
  private chartTooltip$ = new BehaviorSubject<ChartTooltipState>(getChartTooltipDefaultState());

  public tooltipState$: Observable<ChartTooltipState> = this.chartTooltip$
    .asObservable()
    .pipe(distinctUntilChanged(isEqual));

  public show(
    tooltipData: TooltipData,
    target?: HTMLElement | null,
    offset: TooltipOffset = { x: 0, y: 0 }
  ) {
    if (typeof target !== 'undefined' && target !== null) {
      this.chartTooltip$.next({
        ...this.chartTooltip$.getValue(),
        isTooltipVisible: true,
        offset,
        targetPosition: target.getBoundingClientRect(),
        tooltipData,
        target,
      });
    }
  }

  public hide() {
    this.chartTooltip$.next({
      ...getChartTooltipDefaultState(),
      isTooltipVisible: false,
    });
  }
}
