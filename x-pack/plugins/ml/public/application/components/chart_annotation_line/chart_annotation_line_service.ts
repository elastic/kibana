/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { isEqual } from 'lodash';
import { distinctUntilChanged } from 'rxjs/operators';

export interface ChartAnnotationLineValue {
  skipHeader?: boolean;
}

export interface AnnotationLineHeader {
  skipHeader: boolean;
}

export type AnnotationLineData = ChartAnnotationLineValue[];

export interface ChartAnnotationLineState {
  isAnnotationLineVisible: boolean;
  xValue: number | string | Date | null;
}

export const getChartAnnotationLineDefaultState = (): ChartAnnotationLineState => ({
  isAnnotationLineVisible: false,
  xValue: null,
});

export class ChartAnnotationLineService {
  private chartAnnotationLine$ = new BehaviorSubject<ChartAnnotationLineState>(
    getChartAnnotationLineDefaultState()
  );

  public annotationLineState$: Observable<ChartAnnotationLineState> = this.chartAnnotationLine$
    .asObservable()
    .pipe(distinctUntilChanged(isEqual));

  public update(xValue: number) {
    if (!xValue) {
      throw new Error('value is required for the annotation line');
    }

    console.log('xValue', xValue);
    this.chartAnnotationLine$.next({
      ...this.chartAnnotationLine$.getValue(),
      isAnnotationLineVisible: true,
      xValue,
    });
  }

  public hide() {
    this.chartAnnotationLine$.next({
      ...getChartAnnotationLineDefaultState(),
      isAnnotationLineVisible: false,
    });
  }
}
