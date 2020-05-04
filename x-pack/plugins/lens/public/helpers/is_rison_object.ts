/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonObject, RisonValue } from 'rison-node';
import { isObject } from 'lodash';

export const isRisonObject = (value: RisonValue): value is RisonObject => {
  return isObject(value);
};
