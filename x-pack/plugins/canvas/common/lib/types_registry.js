/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '../../common/lib/registry';
import { Type } from '../../common/lib/type';

class TypesRegistry extends Registry {
  wrapper(obj) {
    return new Type(obj);
  }
}

export const typesRegistry = new TypesRegistry();
