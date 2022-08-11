/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XJson } from '@kbn/es-ui-shared-plugin/public';

const { collapseLiteralStrings } = XJson;

export function checkForParseErrors(json: string) {
  const sanitizedJson = collapseLiteralStrings(json);
  try {
    const parsedJson = JSON.parse(sanitizedJson);
    return { parsed: parsedJson, error: null };
  } catch (error) {
    return { error, parsed: null };
  }
}
