/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

if (!Deno.env.get('ACTION_CONTEXT')) {
  throw new Error('ACTION_CONTEXT not set');
}

const actionContext = JSON.parse(Deno.env.get('ACTION_CONTEXT'));

export function getContext() {
  return actionContext;
}

export function addToContext(key: string, value: string) {
  console.log(`newContextToAdd:${JSON.stringify({ key, value })}`);
}
