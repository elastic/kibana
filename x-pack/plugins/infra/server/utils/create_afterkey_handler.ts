/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import { InfraDatabaseSearchResponse } from '../lib/adapters/framework';

export const createAfterKeyHandler = (
  optionsAfterKeyPath: string | string[],
  afterKeySelector: (input: InfraDatabaseSearchResponse<any, any>) => any
) => <Options>(options: Options, response: InfraDatabaseSearchResponse<any, any>): Options => {
  if (!response.aggregations) {
    return options;
  }
  const newOptions = { ...options } as any;
  const afterKey = afterKeySelector(response);
  set(newOptions, optionsAfterKeyPath, afterKey);
  return newOptions;
};
