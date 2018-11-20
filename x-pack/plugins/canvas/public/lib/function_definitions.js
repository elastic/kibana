/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uniqBy from 'lodash.uniqby';
<<<<<<< HEAD
import { getServerFunctions } from '../state/selectors/app';
import { getBrowserRegistries } from './browser_registries';
=======
import { getBrowserRegistries } from '@kbn/interpreter/public/browser_registries';
import { getServerFunctions } from '../state/selectors/app';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

export async function getFunctionDefinitions(state) {
  const { browserFunctions } = await getBrowserRegistries();
  const serverFunctions = getServerFunctions(state);
  return uniqBy(serverFunctions.concat(browserFunctions.toArray()), 'name');
}
