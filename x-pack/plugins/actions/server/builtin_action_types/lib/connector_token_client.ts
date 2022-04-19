/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { Logger, SavedObjectsClientContract, SavedObjectsUtils } from '@kbn/core/server';
import { ConnectorToken } from '../../types';
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
  expiresAtMillis: string;
  tokenType?: string;
}

export interface UpdateOptions {
  id: string;
  token: string;
  expiresAtMillis: string;
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
    expiresAtMillis,
    tokenType,
  }: CreateOptions): Promise<ConnectorToken> {
    const id = SavedObjectsUtils.generateId();
    const createTime = Date.now();
    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        {
          connectorId,
          token,
          expiresAt: expiresAtMillis,
          tokenType: tokenType ?? 'access_token',
          createdAt: new Date(createTime).toISOString(),
          updatedAt: new Date(createTime).toISOString(),
        },
        { id }
      );

      return result.attributes as ConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to create connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Update connector token
   */
  public async update({
    id,
    token,
    expiresAtMillis,
    tokenType,
  }: UpdateOptions): Promise<ConnectorToken | null> {
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        id
      );
    const createTime = Date.now();
    const conflicts = await this.unsecuredSavedObjectsClient.checkConflicts([
      { id, type: 'connector_token' },
    ]);
    try {
      if (conflicts.errors.length > 0) {
        this.logger.error(
          `Failed to update connector_token for id "${id}" and tokenType: "${
            tokenType ?? 'access_token'
          }". ${conflicts.errors.reduce(
            (messages, errorObj) => `Error: ${errorObj.error.message} ${messages}`,
            ''
          )}`
        );
        return null;
      } else {
        const result = await this.unsecuredSavedObjectsClient.create<ConnectorToken>(
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          {
            ...attributes,
            token,
            expiresAt: expiresAtMillis,
            tokenType: tokenType ?? 'access_token',
            updatedAt: new Date(createTime).toISOString(),
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
    } catch (err) {
      this.logger.error(
        `Failed to update connector_token for id "${id}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      throw err;
    }
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
  }): Promise<{
    hasErrors: boolean;
    connectorToken: ConnectorToken | null;
  }> {
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
            sortField: 'updatedAt',
            sortOrder: 'desc',
          })
        ).saved_objects
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }

    if (connectorTokensResult.length === 0) {
      return { hasErrors: false, connectorToken: null };
    }

    try {
      const {
        attributes: { token },
      } = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        connectorTokensResult[0].id
      );

      return {
        hasErrors: false,
        connectorToken: {
          id: connectorTokensResult[0].id,
          ...connectorTokensResult[0].attributes,
          token,
        },
      };
    } catch (err) {
      this.logger.error(
        `Failed to decrypt connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }
  }

  /**
   * Delete all connector tokens
   */
  public async deleteConnectorTokens({
    connectorId,
    tokenType,
  }: {
    connectorId: string;
    tokenType?: string;
  }) {
    const tokenTypeFilter = tokenType
      ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
      : '';
    try {
      const result = await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
        type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
      });
      return Promise.all(
        result.saved_objects.map(
          async (obj) =>
            await this.unsecuredSavedObjectsClient.delete(CONNECTOR_TOKEN_SAVED_OBJECT_TYPE, obj.id)
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete connector_token records for connectorId "${connectorId}". Error: ${err.message}`
      );
      throw err;
    }
  }
}
