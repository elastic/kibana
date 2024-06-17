/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assetKindRT } from '../../common/types_api';

export function parseEan(ean: string) {
  const [kind, id, ...rest] = ean.split(':');

  if (!assetKindRT.is(kind) || !kind || !id || rest.length > 0) {
    throw new Error(`${ean} is not a valid EAN`);
  }

  return { kind, id };
}
