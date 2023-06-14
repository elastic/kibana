/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MaintenanceWindow as MaintenanceWindowServerSide,
  MaintenanceWindowModificationMetadata,
} from '../../../common';

export enum RRuleFrequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
}

export const RRuleFrequencyMap = {
  '0': RRuleFrequency.YEARLY,
  '1': RRuleFrequency.MONTHLY,
  '2': RRuleFrequency.WEEKLY,
  '3': RRuleFrequency.DAILY,
};

export type MaintenanceWindow = Pick<MaintenanceWindowServerSide, 'title' | 'duration' | 'rRule'>;

export type MaintenanceWindowFindResponse = MaintenanceWindowServerSide &
  MaintenanceWindowModificationMetadata & {
    total: number;
  };

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}
