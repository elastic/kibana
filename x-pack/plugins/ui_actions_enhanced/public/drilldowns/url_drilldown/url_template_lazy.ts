/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function urlDrilldownCompileUrl(
  urlTemplate: string,
  context: object,
  doEncode: boolean = true
) {
  const { compile } = await import('./url_template');
  return compile(urlTemplate, context, doEncode);
}
