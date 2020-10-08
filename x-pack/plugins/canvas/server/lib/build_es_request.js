/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildBoolArray } from './build_bool_array';

export function buildESRequest(esRequest, canvasQuery) {
  if (canvasQuery.size) {
    esRequest = { ...esRequest, size: canvasQuery.size };
  }

  if (canvasQuery.and) {
    esRequest.body.query.bool.must = buildBoolArray(canvasQuery.and);
  }

  return esRequest;
}
