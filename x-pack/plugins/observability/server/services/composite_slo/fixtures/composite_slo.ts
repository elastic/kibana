/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { v1 as uuidv1 } from 'uuid';
import { SavedObject } from '@kbn/core-saved-objects-server';

import { compositeSloSchema } from '@kbn/slo-schema';
import { SO_COMPOSITE_SLO_TYPE } from '../../../saved_objects';
import { CompositeSLO, StoredCompositeSLO, WeightedAverageSource } from '../../../domain/models';
import { sevenDaysRolling } from '../../slo/fixtures/time_window';

export const createWeightedAverageSource = (
  params: Partial<WeightedAverageSource> = {}
): WeightedAverageSource => {
  return cloneDeep({
    id: uuidv1(),
    revision: 1,
    weight: 1,
    ...params,
  });
};

const defaultCompositeSLO: Omit<CompositeSLO, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'some composite slo',
  timeWindow: sevenDaysRolling(),
  budgetingMethod: 'occurrences',
  objective: {
    target: 0.95,
  },
  compositeMethod: 'weightedAverage',
  sources: [createWeightedAverageSource(), createWeightedAverageSource()],
  tags: ['critical', 'k8s'],
};

export const createCompositeSLO = (params: Partial<CompositeSLO> = {}): CompositeSLO => {
  const now = new Date();
  return cloneDeep({
    ...defaultCompositeSLO,
    id: uuidv1(),
    createdAt: now,
    updatedAt: now,
    ...params,
  });
};

export const aStoredCompositeSLO = (
  compositeSlo: CompositeSLO
): SavedObject<StoredCompositeSLO> => {
  return {
    id: uuidv1(),
    attributes: compositeSloSchema.encode(compositeSlo),
    type: SO_COMPOSITE_SLO_TYPE,
    references: [],
  };
};
