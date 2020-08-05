/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';
import { THROTTLE_OPTIONS, DEFAULT_THROTTLE_OPTION } from '../throttle_select_field';

export const buildThrottleDescription = (value = DEFAULT_THROTTLE_OPTION.value, title: string) => {
  const throttleOption = find(['value', value], THROTTLE_OPTIONS);

  return {
    title,
    description: throttleOption ? throttleOption.text : value,
  };
};
