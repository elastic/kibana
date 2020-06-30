/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';

export interface TimeRangeBounds {
  min?: Moment;
  max?: Moment;
}

export declare interface TimeBucketsInterval {
  asMilliseconds: () => number;
  asSeconds: () => number;
  expression: string;
}

export interface TimeBucketsConfig {
  'histogram:maxBars': number;
  'histogram:barTarget': number;
  dateFormat: string;
  'dateFormat:scaled': string[][];
}

export declare class TimeBuckets {
  constructor(timeBucketsConfig: TimeBucketsConfig);
  public setBarTarget(barTarget: number): void;
  public setMaxBars(maxBars: number): void;
  public setInterval(interval: string): void;
  public setBounds(bounds: TimeRangeBounds): void;
  public getBounds(): { min: any; max: any };
  public getInterval(): TimeBucketsInterval;
  public getScaledDateFormat(): string;
}

export declare function getTimeBucketsFromCache(): InstanceType<typeof TimeBuckets>;

export declare function getBoundsRoundedToInterval(
  bounds: TimeRangeBounds,
  interval: TimeBucketsInterval,
  inclusiveEnd?: boolean
): Required<TimeRangeBounds>;
