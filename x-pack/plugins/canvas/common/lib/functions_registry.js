/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '../../common/lib/registry';
import { Fn } from '../lib/fn';

class FunctionsRegistry extends Registry {
  wrapper(obj) {
    return new Fn(obj);
  }
}

export const functionsRegistry = new FunctionsRegistry();
