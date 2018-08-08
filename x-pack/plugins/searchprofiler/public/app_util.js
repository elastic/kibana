/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function checkForParseErrors(json) {
  try {
    json = JSON.parse(json);
  } catch (error) {
    return { status: false, error };
  }

  return { status: true, parsed: json };
}
