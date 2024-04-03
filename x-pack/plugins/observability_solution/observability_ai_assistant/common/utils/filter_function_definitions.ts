/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionDefinition } from '../functions/types';

export function filterFunctionDefinitions({
  contexts,
  filter,
  definitions,
}: {
  contexts?: string[];
  filter?: string;
  definitions: FunctionDefinition[];
}) {
  return contexts || filter
    ? definitions.filter((fn) => {
        const matchesContext =
          !contexts || fn.contexts.some((context) => contexts.includes(context));
        const matchesFilter =
          !filter || fn.name.includes(filter) || fn.description.includes(filter);

        return matchesContext && matchesFilter;
      })
    : definitions;
}
