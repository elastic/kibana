/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import { ConnectorToken } from '../../types';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectsUtils,
} from '../../../../../../src/core/server';
import { CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';

export const MAX_TOKENS_RETURNED = 1;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateOptions {
  connectorId: string;
  token: string;
  expiresAt: string;
  tokenType?: string;
}

export interface UpdateOptions {
  id: string;
  token: string;
  expiresAt: string;
  tokenType?: string;
}

export class ConnectorTokenClient {
  private readonly logger: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
  }: ConstructorOptions) {
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.logger = logger;
  }

  /**
   * Create new token for connector
   */
  public async create({
    connectorId,
    token,
    expiresAt,
    tokenType,
  }: CreateOptions): Promise<ConnectorToken> {
    const id = SavedObjectsUtils.generateId();
    const createTime = Date.now();
    const result = await this.unsecuredSavedObjectsClient.create(
      CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      {
        connectorId,
        token,
        expiresAt,
        tokenType,
        createdAt: new Date(createTime).toISOString(),
      },
      { id }
    );

    return result.attributes as ConnectorToken;
  }

  /**
   * Update connector token
   */
  public async update({ id, token, expiresAt, tokenType }: UpdateOptions): Promise<ConnectorToken> {
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        id
      );
    const createTime = Date.now();

    const result = await this.unsecuredSavedObjectsClient.create<ConnectorToken>(
      CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      {
        ...attributes,
        token,
        expiresAt,
        tokenType: tokenType ?? 'access_token',
        createdAt: new Date(createTime).toISOString(),
      },
      omitBy(
        {
          id,
          overwrite: true,
          references,
          version,
        },
        isUndefined
      )
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
    const connectorTokensResult = [];
    const tokenTypeFilter = tokenType
      ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
      : '';

    try {
      connectorTokensResult.push(
        ...(
          await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
            perPage: MAX_TOKENS_RETURNED,
            type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
            filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
            sortField: 'createdAt',
            sortOrder: 'desc',
          })
        ).saved_objects
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }"". Error: ${err.message}`
      );
      return null;
    }

    if (connectorTokensResult.length === 0) {
      return null;
    }

    try {
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
    } catch (err) {
      this.logger.error(
        `Failed to decrypt connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }"". Error: ${err.message}`
      );
      return null;
    }
  }
}
