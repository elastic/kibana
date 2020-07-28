/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataAccessLayer } from '../../types';

export function withManuallyControlledResponses(
  dataAccessLayer: DataAccessLayer
): { respond: () => void; dataAccessLayer: DataAccessLayer } {
  const resolvers: Set<() => void> = new Set();
  return {
    respond() {
      const oldResolvers = [...resolvers];
      // clear the old set before resolving, since resolving could cause more things to be added to the set
      resolvers.clear();
      for (const resolve of oldResolvers) {
        resolve();
      }
    },
    dataAccessLayer: {
      ...dataAccessLayer,
      relatedEvents: controlledPromise(dataAccessLayer.relatedEvents),
      resolverTree: controlledPromise(dataAccessLayer.resolverTree),
      entities: controlledPromise(dataAccessLayer.entities),
    },
  };
  function controlledPromise<Args extends unknown[], R>(
    fn: (this: DataAccessLayer, ...args: Args) => Promise<R>
  ): (this: DataAccessLayer, ...args: Args) => Promise<R> {
    return async function (...args: Args) {
      await new Promise((resolve) => {
        resolvers.add(resolve);
      });
      return fn.call(this, ...args);
    };
  }
}
