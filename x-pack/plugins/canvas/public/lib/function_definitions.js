/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registries } from '@kbn/interpreter/public';
import uniqBy from 'lodash.uniqby';
import { getServerFunctions } from '../state/selectors/app';

export async function getFunctionDefinitions(state) {
  const serverFunctions = getServerFunctions(state);
  return uniqBy(serverFunctions.concat(registries.browserFunctions.toArray()), 'name');
}
