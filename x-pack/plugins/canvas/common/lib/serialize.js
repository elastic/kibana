/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, identity } from 'lodash';
import { getType } from '../lib/get_type';

export function serializeProvider(types) {
  return {
    serialize: provider('serialize'),
    deserialize: provider('deserialize'),
  };

  function provider(key) {
    return context => {
      const type = getType(context);
      const typeDef = types[type];
      const fn = get(typeDef, key) || identity;
      return fn(context);
    };
  }
}
