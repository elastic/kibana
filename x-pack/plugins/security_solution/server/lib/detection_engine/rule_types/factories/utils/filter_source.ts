/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalSource } from '../../../signals/types';
import { RACAlert } from '../../types';

export const filterSource = (docSource: SignalSource): Partial<RACAlert> => {
  const { threshold_result: thresholdResult, ...filteredSource } = docSource || {
    threshold_result: null,
  };
  return {
    message: filteredSource.message ?? '',
    tags: (filteredSource.tags ?? []) as string[],
  };
};
