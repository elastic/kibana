/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function string(
  parts: TemplateStringsArray,
  ...variables: Array<string | number>
): string {
  const joined = Array.from(parts.raw).concat(variables.map(String)).join('');
  return `"${joined.replaceAll(/[^\\]"/g, '\\"')}"`;
}

export function identifier(
  parts: TemplateStringsArray,
  ...variables: Array<string | number>
): string {
  const joined = Array.from(parts.raw).concat(variables.map(String)).join('');

  const escaped = `\`${joined.replaceAll(/[^\\]`/g, '\\`')}\``;

  return escaped;
}
