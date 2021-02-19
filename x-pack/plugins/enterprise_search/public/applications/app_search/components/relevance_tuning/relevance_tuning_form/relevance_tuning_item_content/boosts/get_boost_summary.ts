/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boost, BoostType } from '../../../types';

export const getBoostSummary = (boost: Boost): string => {
  if (boost.type === BoostType.Value) {
    return !boost.value ? '' : boost.value.join(',');
  } else if (boost.type === BoostType.Proximity) {
    return boost.function || '';
  } else {
    return [boost.function || '', boost.operation || ''].join(' ').trim();
  }
};
