/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import crypto from 'crypto';

import { CASE_SAVED_OBJECT, CASE_SYNC_SAVED_OBJECT } from '../../../common/constants';
import { CASE_ID_REFERENCE_NAME, CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import type { ServiceContext, Sync } from './types';

export class SyncSavedObjectService {
  constructor(private readonly context: ServiceContext) {}

  public async get({
    connectorId,
    caseId,
  }: {
    connectorId: string;
    caseId: string;
  }): Promise<SavedObject<Sync> | undefined> {
    try {
      const savedObjectId = this.getSavedObjectId({ connectorId, caseId });

      const syncInfo = await this.context.unsecuredSavedObjectsClient.get<Sync>(
        CASE_SYNC_SAVED_OBJECT,
        savedObjectId
      );

      return {
        ...syncInfo,
        attributes: {
          ...syncInfo.attributes,
          caseId,
          connectorId,
        },
      };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return;
      }

      this.context.log.error(
        `Error while retrieving the sync object connectorId: ${connectorId} caseId: ${caseId} error: ${error}`
      );
      throw error;
    }
  }

  private getSavedObjectId({
    connectorId,
    caseId,
  }: {
    connectorId: string;
    caseId: string;
  }): string {
    const hasher = crypto.createHash('sha256');
    const sha256Hash = hasher.update(`${connectorId}:${caseId}`);
    const savedObjectId = sha256Hash.digest('hex');

    return savedObjectId;
  }

  public async create({
    connectorId,
    caseId,
    externalId,
    lastSyncedAt,
  }: {
    connectorId: string;
    caseId: string;
    externalId: string;
    lastSyncedAt: string;
  }) {
    try {
      const savedObjectId = this.getSavedObjectId({ connectorId, caseId });

      await this.context.unsecuredSavedObjectsClient.create(
        CASE_SYNC_SAVED_OBJECT,
        {
          externalId,
          lastSyncedAt,
        },
        {
          id: savedObjectId,
          references: [
            { id: connectorId, name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
            { id: caseId, name: CASE_ID_REFERENCE_NAME, type: CASE_SAVED_OBJECT },
          ],
        }
      );
    } catch (error) {
      this.context.log.error(
        `Error creating sync object connectorId: ${connectorId} caseId: ${caseId} error: ${error}`
      );
      throw error;
    }
  }

  public async update({
    connectorId,
    caseId,
    lastSyncedAt,
    version,
  }: {
    connectorId: string;
    caseId: string;
    lastSyncedAt: string;
    version: string;
  }) {
    try {
      const savedObjectId = this.getSavedObjectId({ connectorId, caseId });

      await this.context.unsecuredSavedObjectsClient.update(
        CASE_SYNC_SAVED_OBJECT,
        savedObjectId,
        {
          lastSyncedAt,
        },
        { version }
      );
    } catch (error) {
      this.context.log.error(
        `Error updating sync object connectorId: ${connectorId} caseId: ${caseId} error: ${error}`
      );
      throw error;
    }
  }
}
