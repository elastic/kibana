/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectAttributes,
  SavedObjectsClientContract,
  SavedObjectsUtils,
} from '@kbn/core/server';
import { ACTION_TEMPLATE_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

interface ConstructorOptions {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface CreateOptions {
  name: string;
  template: string;
  connectorId?: string;
  connectorTypeId: string;
}

export interface ActionTemplate extends SavedObjectAttributes {
  name: string;
  template: string;
  connectorId?: string;
  connectorTypeId: string;
}

export interface UpdateOptions {
  id: string;
  template: string;
}

export class ActionTemplateClient {
  private readonly logger: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;

  constructor({ unsecuredSavedObjectsClient, logger }: ConstructorOptions) {
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.logger = logger;
  }

  public async create({
    name,
    connectorId,
    connectorTypeId,
    template,
  }: CreateOptions): Promise<ActionTemplate> {
    const id = SavedObjectsUtils.generateId();
    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        ACTION_TEMPLATE_SAVED_OBJECT_TYPE,
        {
          name,
          connectorId,
          connectorTypeId,
          template,
        },
        { id }
      );

      return result.attributes as ActionTemplate;
    } catch (err) {
      this.logger.error(`Failed to create action_template - ${err.message}`);
      throw err;
    }
  }

  // /**
  //  * Get connector token
  //  */
  // public async get({
  //   connectorId,
  //   tokenType,
  // }: {
  //   connectorId: string;
  //   tokenType?: string;
  // }): Promise<{
  //   hasErrors: boolean;
  //   connectorToken: ConnectorToken | null;
  // }> {
  //   const connectorTokensResult = [];
  //   const tokenTypeFilter = tokenType
  //     ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
  //     : '';

  //   try {
  //     connectorTokensResult.push(
  //       ...(
  //         await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
  //           perPage: MAX_TOKENS_RETURNED,
  //           type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  //           filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
  //           sortField: 'updatedAt',
  //           sortOrder: 'desc',
  //         })
  //       ).saved_objects
  //     );
  //   } catch (err) {
  //     this.logger.error(
  //       `Failed to fetch connector_token for connectorId "${connectorId}" and tokenType: "${
  //         tokenType ?? 'access_token'
  //       }". Error: ${err.message}`
  //     );
  //     return { hasErrors: true, connectorToken: null };
  //   }

  //   if (connectorTokensResult.length === 0) {
  //     return { hasErrors: false, connectorToken: null };
  //   }

  //   let accessToken: string;
  //   try {
  //     const {
  //       attributes: { token },
  //     } = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorToken>(
  //       CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  //       connectorTokensResult[0].id
  //     );

  //     accessToken = token;
  //   } catch (err) {
  //     this.logger.error(
  //       `Failed to decrypt connector_token for connectorId "${connectorId}" and tokenType: "${
  //         tokenType ?? 'access_token'
  //       }". Error: ${err.message}`
  //     );
  //     return { hasErrors: true, connectorToken: null };
  //   }

  //   if (isNaN(Date.parse(connectorTokensResult[0].attributes.expiresAt))) {
  //     this.logger.error(
  //       `Failed to get connector_token for connectorId "${connectorId}" and tokenType: "${
  //         tokenType ?? 'access_token'
  //       }". Error: expiresAt is not a valid Date "${connectorTokensResult[0].attributes.expiresAt}"`
  //     );
  //     return { hasErrors: true, connectorToken: null };
  //   }

  //   return {
  //     hasErrors: false,
  //     connectorToken: {
  //       id: connectorTokensResult[0].id,
  //       ...connectorTokensResult[0].attributes,
  //       token: accessToken,
  //     },
  //   };
  // }

  // /**
  //  * Delete all connector tokens
  //  */
  // public async deleteConnectorTokens({
  //   connectorId,
  //   tokenType,
  // }: {
  //   connectorId: string;
  //   tokenType?: string;
  // }) {
  //   const tokenTypeFilter = tokenType
  //     ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
  //     : '';
  //   try {
  //     const result = await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
  //       type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  //       filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
  //     });
  //     return Promise.all(
  //       result.saved_objects.map(
  //         async (obj) =>
  //           await this.unsecuredSavedObjectsClient.delete(CONNECTOR_TOKEN_SAVED_OBJECT_TYPE, obj.id)
  //       )
  //     );
  //   } catch (err) {
  //     this.logger.error(
  //       `Failed to delete connector_token records for connectorId "${connectorId}". Error: ${err.message}`
  //     );
  //     throw err;
  //   }
  // }
}
