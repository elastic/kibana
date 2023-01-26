/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * validates ES boolean type
 */
export const isValidBooleanType = (boolean: SearchTypes): boolean => {
  // boolean type reference https://www.elastic.co/guide/en/elasticsearch/reference/current/boolean.html
  const availableValues: SearchTypes[] = ['true', 'false', true, false, ''];

  return availableValues.includes(boolean);
};
