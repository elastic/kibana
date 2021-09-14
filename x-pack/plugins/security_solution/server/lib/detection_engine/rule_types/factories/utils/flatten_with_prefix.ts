/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { SearchTypes } from '../../../../../../common/detection_engine/types';

export const flattenWithPrefix = (
  prefix: string,
  maybeObj: unknown
): Record<string, SearchTypes> => {
  if (maybeObj != null && isPlainObject(maybeObj)) {
    return Object.keys(maybeObj as Record<string, SearchTypes>).reduce(
      (acc: Record<string, SearchTypes>, key) => {
        return {
          ...acc,
          ...flattenWithPrefix(`${prefix}.${key}`, (maybeObj as Record<string, SearchTypes>)[key]),
        };
      },
      {}
    );
  } else {
    return {
      [prefix]: maybeObj as SearchTypes,
    };
  }
};
