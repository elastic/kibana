/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, format } from 'url';

export function parseIndexUrl(url: string): { node: string; index: string } {
  const parsed = parse(url);
  const { pathname, ...rest } = parsed;

  return {
    node: format(rest),
    index: pathname!.replace('/', ''),
  };
}
