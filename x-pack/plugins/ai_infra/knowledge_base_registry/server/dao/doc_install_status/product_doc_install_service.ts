/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { InstallationStatus, ProductDocInstallStatus } from '../../../common/saved_objects';
import { productDocInstallStatusSavedObjectTypeName as typeName } from '../../../common/consts';
import type { KnowledgeBaseProductDocInstallAttributes as TypeAttributes } from '../../saved_objects';
import { soToModel } from './model_conversion';

export class ProductDocInstallClient {
  private soClient: SavedObjectsClientContract;

  constructor({ soClient }: { soClient: SavedObjectsClientContract }) {
    this.soClient = soClient;
  }

  /*
  async getForProduct(productName: string): Promise<ProductDocInstallStatus> {
    const objectId = getObjectIdFromProductName(productName);
    try {
      const object = await this.soClient.get<TypeAttributes>(typeName, objectId);
      return soToModel(object);
    } catch (e) {
      // TODO
    }
  }
  */

  async setInstallationStarted(fields: { productName: string; productVersion: string }) {
    const { productName, productVersion } = fields;
    const objectId = getObjectIdFromProductName(productName);
    const attributes = {
      product_name: productName,
      product_version: productVersion,
      installation_status: 'installing' as const,
      last_installation_failure_reason: '',
    };
    await this.soClient.update<TypeAttributes>(typeName, objectId, attributes, {
      upsert: attributes,
    });
  }

  async setInstallationSuccessful(productName: string, indexName: string) {
    const objectId = getObjectIdFromProductName(productName);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'installed',
      index_name: indexName,
    });
  }

  async setInstallationFailed(productName: string, failureReason: string) {
    const objectId = getObjectIdFromProductName(productName);
    await this.soClient.update<TypeAttributes>(typeName, objectId, {
      installation_status: 'error',
      last_installation_failure_reason: failureReason,
    });
  }

  async setUninstalled(productName: string) {
    const objectId = getObjectIdFromProductName(productName);
    try {
      await this.soClient.update<TypeAttributes>(typeName, objectId, {
        installation_status: 'uninstalled',
        last_installation_failure_reason: '',
      });
    } catch (e) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw e;
      }
    }
  }
}

const getObjectIdFromProductName = (productName: string) =>
  `kb-product-doc-${productName}-status`.toLowerCase();
