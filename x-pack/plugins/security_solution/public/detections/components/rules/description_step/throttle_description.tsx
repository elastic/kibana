/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import {
  THROTTLE_OPTIONS_FOR_RULE_CREATION_AND_EDITING,
  DEFAULT_THROTTLE_OPTION,
} from '../throttle_select_field';

export const buildThrottleDescription = (value = DEFAULT_THROTTLE_OPTION.value, title: string) => {
  const throttleOption = find(['value', value], THROTTLE_OPTIONS_FOR_RULE_CREATION_AND_EDITING);

  return {
    title,
    description: throttleOption ? throttleOption.text : value,
  };
};
