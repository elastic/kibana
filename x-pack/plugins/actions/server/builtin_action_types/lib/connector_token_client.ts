/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorToken } from '../../types';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';
import { SavedObjectsClientContract, SavedObjectsUtils } from '../../../../../../src/core/server';
import { CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';

// We are expecting max possible token types for the single connector to be not bigger then 2 - for access and refresh tokens
export const MAX_TOKENS_RETURNED = 2;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
}

interface CreateOptions {
  connectorId: string;
  token: string;
  expiresIn: string;
  tokenType?: string;
}

export interface UpdateOptions {
  id: string;
  token: string;
  expiresIn: string;
  tokenType?: string;
}

export class ConnectorTokenClient {
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({ savedObjectsClient, encryptedSavedObjectsClient }: ConstructorOptions) {
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create new token for connector
   */
  public async create({
    connectorId,
    token,
    expiresIn,
    tokenType,
  }: CreateOptions): Promise<ConnectorToken> {
    const id = SavedObjectsUtils.generateId();
    const result = await this.savedObjectsClient.create(
      CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      {
        connectorId,
        token,
        expiresIn,
        tokenType,
      },
      { id }
    );

    return result.attributes as ConnectorToken;
  }

  /**
   * Update connector token
   */
  public async update({ id, token, expiresIn, tokenType }: UpdateOptions): Promise<ConnectorToken> {
    const result = await this.savedObjectsClient.update<ConnectorToken>(
      CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      id,
      {
        token,
        expiresIn,
        tokenType,
      }
    );

    return result.attributes as ConnectorToken;
  }

  /**
   * Get connector token
   */
  public async get({
    connectorId,
    tokenType,
  }: {
    connectorId: string;
    tokenType?: string;
  }): Promise<ConnectorToken | null> {
    const tokenTypeFilter = tokenType
      ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
      : '';

    const connectorTokensResult = (
      await this.savedObjectsClient.find<ConnectorToken>({
        perPage: MAX_TOKENS_RETURNED,
        type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
      })
    ).saved_objects;

    if (connectorTokensResult.length === 0) {
      return null;
    }
    const {
      attributes: { token },
    } = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorToken>(
      CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      connectorTokensResult[0].id
    );

    return {
      id: connectorTokensResult[0].id,
      ...connectorTokensResult[0].attributes,
      token,
    };
  }
}
