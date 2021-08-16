/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTypes } from '../../../../../../common/detection_engine/types';

export const flattenWithPrefix = (
  prefix: string,
  obj: Record<string, SearchTypes>
): Record<string, SearchTypes> => {
  return Object.keys(obj).reduce((acc: Record<string, SearchTypes>, key) => {
    return {
      ...acc,
      [`${prefix}.${key}`]: obj[key],
    };
  }, {});
};
