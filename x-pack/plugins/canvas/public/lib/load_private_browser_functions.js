/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { commonFunctions } from '../../common/functions';
import { clientFunctions } from '../functions';

/*
  Functions loaded here use PRIVATE APIs
  That is, they probably import a canvas singleton, eg a registry and
  thus must be part of the main Canvas bundle. There should be *very*
  few of these things as we can't thread them.
*/

export const loadPrivateBrowserFunctions = functionsRegistry => {
  function addFunction(fnDef) {
    functionsRegistry.register(fnDef);
  }

  clientFunctions.forEach(addFunction);
  commonFunctions.forEach(addFunction);
};
