/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function compile(
  urlTemplate: string,
  context: object,
  doEncode: boolean = true
): Promise<string> {
  const handlebarsTemplate = (await import('./handlebars').then((m) => m.handlebars)).compile(
    urlTemplate,
    {
      strict: true,
      noEscape: true,
    }
  );

  let processedUrl: string = handlebarsTemplate(context);

  if (doEncode) {
    processedUrl = encodeURI(processedUrl);
  }

  return processedUrl;
}
