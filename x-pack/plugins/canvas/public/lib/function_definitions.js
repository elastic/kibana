/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uniqBy from 'lodash.uniqby';
import { functionsRegistry } from '../../common/lib/functions_registry';
import { getServerFunctions } from '../state/selectors/app';

export function getFunctionDefinitions(state) {
  const serverFunctions = getServerFunctions(state);
  return uniqBy(serverFunctions.concat(functionsRegistry.toArray()), 'name');
}
