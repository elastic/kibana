/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLike } from 'lodash/fp';
import { SearchTypes } from '../../../../../../common/detection_engine/types';

/**
 * Returns true if it is a primitive type, otherwise false
 */
export const isPrimitive = (valueInMergedDocument: SearchTypes | null): boolean => {
  return !isObjectLike(valueInMergedDocument);
};
