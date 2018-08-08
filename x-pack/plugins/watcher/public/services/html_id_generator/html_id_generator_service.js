/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';

export function createHtmlIdGenerator(rootPartOrParts = []) {
  const rootParts = Array.isArray(rootPartOrParts) ? rootPartOrParts : [rootPartOrParts];
  const cache = {};

  return (parts, useRootParts = true) => {
    if (!cache[parts]) {
      const root = useRootParts ? rootParts : [];
      const combined = root.concat(parts);
      const id = camelCase(combined);

      cache[parts] = id;
    }

    return cache[parts];
  };
}
