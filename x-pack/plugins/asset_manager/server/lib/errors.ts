/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AssetNotFoundError extends Error {
  constructor(ean: string) {
    super(`Asset with ean (${ean}) not found in the provided time range`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AssetNotFoundError';
  }
}
