/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionDefinition } from '../functions/types';

export function filterFunctionDefinitions({
  filter,
  definitions,
}: {
  filter?: string;
  definitions: FunctionDefinition[];
}): FunctionDefinition[] {
  return filter
    ? definitions.filter((fn) => {
        const matchesFilter =
          !filter || fn.name.includes(filter) || fn.description.includes(filter);

        return matchesFilter;
      })
    : definitions;
}
