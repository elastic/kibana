/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { CryptoService } from './crypto_service';

interface CasesOracleGetRecordId {
  ruleId: string;
  spaceId: string;
  owner: string;
  groupingDefinition: string;
}

export class CasesOracleService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private cryptoService: CryptoService;

  constructor({
    log,
    unsecuredSavedObjectsClient,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.cryptoService = new CryptoService();
  }

  public getRecordId({
    ruleId,
    spaceId,
    owner,
    groupingDefinition,
  }: CasesOracleGetRecordId): string {
    const payload = `${ruleId}:${spaceId}:${owner}:${groupingDefinition}`;

    return this.cryptoService.getHash(payload);
  }
}
