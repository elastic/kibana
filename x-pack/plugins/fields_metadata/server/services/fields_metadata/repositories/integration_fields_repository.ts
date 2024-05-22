/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import hash from 'object-hash';
import { HashedCache } from '../../../../common/hashed_cache';
import {
  FieldMetadata,
  FieldMetadataPlain,
  IntegrationFieldName,
  PartialFieldMetadataPlain,
} from '../../../../common';
import { IntegrationFieldsExtractor, IntegrationFieldsSearchParams } from './types';
interface IntegrationFieldsRepositoryDeps {
  integrationFieldsExtractor: IntegrationFieldsExtractor;
}

export class IntegrationFieldsRepository {
  private cache: HashedCache<string, Record<string, Record<string, FieldMetadata>>>;

  private constructor(private readonly fieldsExtractor: IntegrationFieldsExtractor) {
    this.cache = new HashedCache();
  }

  async getByName(
    fieldName: IntegrationFieldName,
    { integration, dataset }: IntegrationFieldsSearchParams
  ): Promise<FieldMetadata | undefined> {
    let field = this.getCachedField(fieldName, { integration, dataset });

    if (!field) {
      await this.extractFields({ integration, dataset });

      field = this.getCachedField(fieldName, { integration, dataset });
    }

    return field;
  }

  async find({ fieldNames }: { fieldNames?: IntegrationFieldName[] } = {}) {
    throw new Error('TODO: Implement the IntegrationFieldsRepository#getByName');
  }

  public static create({ integrationFieldsExtractor }: IntegrationFieldsRepositoryDeps) {
    return new IntegrationFieldsRepository(integrationFieldsExtractor);
  }

  private async extractFields({
    integration,
    dataset,
  }: IntegrationFieldsSearchParams): Promise<void> {
    const cacheKey = this.getCacheKey({ integration, dataset });
    const cachedIntegration = this.cache.get(cacheKey);

    if (cachedIntegration) {
      return undefined;
    }

    return this.fieldsExtractor({ integration, dataset })
      .then(this.mapExtractedFieldsToFieldMetadataInstances)
      .then((fieldMetadataTree) => this.storeFieldsInCache(cacheKey, fieldMetadataTree));
  }

  private getCachedField(
    fieldName: IntegrationFieldName,
    { integration, dataset }: IntegrationFieldsSearchParams
  ): FieldMetadata | undefined {
    const cacheKey = this.getCacheKey({ integration, dataset });
    const cachedIntegration = this.cache.get(cacheKey);

    // 1. Integration fields were never fetched
    if (!cachedIntegration) {
      return undefined;
    }

    // 2. Dataset is passed but was never fetched before
    if (dataset && !cachedIntegration.hasOwnProperty(dataset)) {
      return undefined;
    }

    // 3. Dataset is passed and it was previously fetched, should return the field
    if (dataset && cachedIntegration.hasOwnProperty(dataset)) {
      const targetDataset = cachedIntegration[dataset];
      return targetDataset[fieldName];
    }

    // 4. Dataset is not passed, we attempt search on all stored datasets
    if (!dataset) {
      // Merge all the available datasets into a unique field list. Overriding fields might occur in the process.
      const cachedDatasetsFields = Object.assign({}, ...Object.values(cachedIntegration));
      return cachedDatasetsFields[fieldName];
    }
  }

  private storeFieldsInCache = (
    cacheKey: string,
    extractedFieldsMetadata: Record<string, Record<string, FieldMetadata>>
  ): void => {
    const cachedIntegration = this.cache.get(cacheKey);

    if (!cachedIntegration) {
      this.cache.set(cacheKey, extractedFieldsMetadata);
    } else {
      this.cache.set(cacheKey, { ...cachedIntegration, ...extractedFieldsMetadata });
    }
  };

  private getCacheKey = (params: IntegrationFieldsSearchParams) => hash(params);

  private mapExtractedFieldsToFieldMetadataInstances = (
    extractedFields: Record<string, Record<string, PartialFieldMetadataPlain>>
  ) => {
    return Object.entries(extractedFields).reduce(
      (integrationGroup, [datasetName, datasetGroup]) => {
        integrationGroup[datasetName] = Object.entries(datasetGroup).reduce(
          (datasetGroupResult, [extractedFieldName, extractedField]) => {
            datasetGroupResult[extractedFieldName] = FieldMetadata.create({
              ...extractedField,
              source: 'integration',
            });
            return datasetGroupResult;
          },
          {} as Record<string, FieldMetadata>
        );

        return integrationGroup;
      },
      {} as Record<string, Record<string, FieldMetadata>>
    );
  };
}
