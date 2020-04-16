/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

declare interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}

export declare interface TimeBucketsInterval {
  asMilliseconds: () => number;
  asSeconds: () => number;
  expression: string;
}

export declare class TimeBuckets {
  constructor();
  public setBarTarget(barTarget: number): void;
  public setMaxBars(maxBars: number): void;
  public setInterval(interval: string): void;
  public setBounds(bounds: TimeRangeBounds): void;
  public getBounds(): { min: any; max: any };
  public getInterval(): TimeBucketsInterval;
  public getScaledDateFormat(): string;
}
