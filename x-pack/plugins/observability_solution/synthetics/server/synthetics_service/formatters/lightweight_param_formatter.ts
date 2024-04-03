/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ParsedVars = Array<
  | { content: string; type: 'nonvar' }
  | { content: { default: null | string; name: string }; type: 'var' }
>;

export function replaceVarsWithParams(vars: ParsedVars, params: Record<string, string>) {
  return vars
    .map((v) => {
      if (v.type === 'nonvar') {
        return v.content;
      }
      return params[v.content.name]?.trim() || v.content.default;
    })
    .join('');
}
