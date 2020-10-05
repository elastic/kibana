/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { capitalize } from 'lodash';
import { APM_SYSTEM_ID, BEATS_SYSTEM_ID } from '../../../common/constants';

export function getStackProductLabel(stackProduct: string) {
  switch (stackProduct) {
    case APM_SYSTEM_ID:
      return 'APM';
    case BEATS_SYSTEM_ID:
      return 'Beat';
  }
  return capitalize(stackProduct);
}
