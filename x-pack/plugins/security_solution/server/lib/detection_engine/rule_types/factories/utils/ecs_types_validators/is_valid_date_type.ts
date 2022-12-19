/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * validates ES date type
 */
export const isValidDateType = (date: SearchTypes): boolean => {
  if (typeof date !== 'string' && typeof date !== 'number') {
    return false;
  }
  return !isNaN(new Date(date).getTime());
};
