/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/common';
import { Transition } from '../transitions/transition';

class TransitionsRegistry extends Registry {
  wrapper(obj) {
    return new Transition(obj);
  }
}

export const transitionsRegistry = new TransitionsRegistry();
