/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
export declare function asAbsoluteDateTime(time: number, timeUnit?: TimeUnit): string;
interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  timeUnit?: TimeUnit;
}
export declare function TimestampTooltip({ time, timeUnit }: Props): React.JSX.Element;
export {};
