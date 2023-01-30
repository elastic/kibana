/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { v1 as uuidv1 } from 'uuid';
import { SavedObject } from '@kbn/core-saved-objects-server';
import { sloSchema, CreateSLOParams } from '@kbn/slo-schema';

import { SO_SLO_TYPE } from '../../../saved_objects';
import {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Duration,
  DurationUnit,
  Indicator,
  KQLCustomIndicator,
  SLO,
  StoredSLO,
} from '../../../domain/models';
import { Paginated } from '../slo_repository';
import { sevenDays, twoMinute } from './duration';
import { sevenDaysRolling } from './time_window';

export const createAPMTransactionErrorRateIndicator = (
  params: Partial<APMTransactionErrorRateIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transactionErrorRate',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transactionName: 'irrelevant',
    transactionType: 'irrelevant',
    goodStatusCodes: ['2xx', '3xx', '4xx'],
    ...params,
  },
});

export const createAPMTransactionDurationIndicator = (
  params: Partial<APMTransactionDurationIndicator['params']> = {}
): Indicator => ({
  type: 'sli.apm.transactionDuration',
  params: {
    environment: 'irrelevant',
    service: 'irrelevant',
    transactionName: 'irrelevant',
    transactionType: 'irrelevant',
    'threshold.us': 500000,
    ...params,
  },
});

export const createKQLCustomIndicator = (
  params: Partial<KQLCustomIndicator['params']> = {}
): Indicator => ({
  type: 'sli.kql.custom',
  params: {
    index: 'my-index*',
    filter: 'labels.groupId: group-3',
    good: 'latency < 300',
    total: '',
    ...params,
  },
});

const defaultSLO: Omit<SLO, 'id' | 'revision' | 'createdAt' | 'updatedAt'> = {
  name: 'irrelevant',
  description: 'irrelevant',
  timeWindow: sevenDaysRolling(),
  budgetingMethod: 'occurrences',
  objective: {
    target: 0.999,
  },
  indicator: createAPMTransactionDurationIndicator(),
  settings: {
    timestampField: '@timestamp',
    syncDelay: new Duration(1, DurationUnit.Minute),
    frequency: new Duration(1, DurationUnit.Minute),
  },
};

export const createSLOParams = (params: Partial<CreateSLOParams> = {}): CreateSLOParams => ({
  ...defaultSLO,
  ...params,
});

export const aStoredSLO = (slo: SLO): SavedObject<StoredSLO> => {
  return {
    id: slo.id,
    attributes: sloSchema.encode(slo),
    type: SO_SLO_TYPE,
    references: [],
  };
};

export const createSLO = (params: Partial<SLO> = {}): SLO => {
  const now = new Date();
  return cloneDeep({
    ...defaultSLO,
    id: uuidv1(),
    revision: 1,
    createdAt: now,
    updatedAt: now,
    ...params,
  });
};

export const createSLOWithTimeslicesBudgetingMethod = (params: Partial<SLO> = {}): SLO => {
  return createSLO({
    budgetingMethod: 'timeslices',
    objective: {
      target: 0.98,
      timesliceTarget: 0.95,
      timesliceWindow: twoMinute(),
    },
    ...params,
  });
};

export const createSLOWithCalendarTimeWindow = (params: Partial<SLO> = {}): SLO => {
  return createSLO({
    timeWindow: {
      duration: sevenDays(),
      calendar: { startTime: new Date('2022-10-01T00:00:00.000Z') },
    },
    ...params,
  });
};

export const createPaginatedSLO = (
  slo: SLO,
  params: Partial<Paginated<SLO>> = {}
): Paginated<SLO> => {
  return {
    page: 1,
    perPage: 25,
    total: 1,
    results: [slo],
    ...params,
  };
};
