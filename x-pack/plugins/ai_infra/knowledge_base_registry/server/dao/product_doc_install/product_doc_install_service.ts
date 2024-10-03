/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { ProducDocInstallDTO } from '../../../common/saved_objects';
import { knowledgeBaseProductDocInstallTypeName as typeName } from '../../../common/consts';
import type { KnowledgeBaseProductDocInstallAttributes } from '../../saved_objects';
import { soToDto } from './so_to_dto';

export class ProductDocInstallClient {
  private soClient: SavedObjectsClientContract;

  constructor({ soClient }: { soClient: SavedObjectsClientContract }) {
    this.soClient = soClient;
  }

  async getByProductName(productName: string): Promise<ProducDocInstallDTO | undefined> {
    const response = await this.soClient.find<KnowledgeBaseProductDocInstallAttributes>({
      type: typeName,
      perPage: 1,
      filter: `${typeName}.product_name: "${productName}"`,
    });
    if (response.saved_objects.length === 1) {
      return soToDto(response.saved_objects[0]);
    }
    if (response.saved_objects.length > 1) {
      throw new Error(`Found multiple records for product name : ${productName}`);
    }
    return undefined;
  }
}
