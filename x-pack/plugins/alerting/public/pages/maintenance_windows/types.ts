/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Frequency } from './constants';

export interface MaintenanceWindow {
  title: string;
  date: Moment;
  duration: number;
}

export interface RecurringSchedule {
  frequency: Frequency;
  interval: number;
  until?: Moment;
  count?: number;
  byweekday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}
