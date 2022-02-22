/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';

export function decodeMvtResponseBody(decodedRequestBody: string): object {
  return rison.decode(decodeURIComponent(decodedRequestBody));
}

export function encodeMvtResponseBody(unencodedRequestBody: object): string {
  return encodeURIComponent(rison.encode(unencodedRequestBody));
}
