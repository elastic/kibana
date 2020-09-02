/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DatabaseParameters } from '../types';

export function equal(param1: DatabaseParameters, param2?: DatabaseParameters) {
  return _.isEqual(param1, param2);
}
