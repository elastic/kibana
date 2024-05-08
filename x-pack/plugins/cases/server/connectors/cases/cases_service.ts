/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CryptoService } from './crypto_service';
import type { CaseIdPayload } from './types';

export class CasesService {
  private cryptoService: CryptoService;

  constructor() {
    this.cryptoService = new CryptoService();
  }

  public getCaseId({ ruleId, spaceId, owner, grouping, counter }: CaseIdPayload): string {
    if (grouping == null && ruleId == null) {
      throw new Error('ruleID or grouping is required');
    }

    const payload = [
      ruleId,
      spaceId,
      owner,
      this.cryptoService.stringifyDeterministically(grouping),
      counter,
    ]
      .filter(Boolean)
      .join(':');

    return this.cryptoService.getHash(payload);
  }
}
