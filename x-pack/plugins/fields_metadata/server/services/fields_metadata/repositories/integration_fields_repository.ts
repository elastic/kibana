/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HashedCache } from '../../../../common/hashed_cache';
import { FieldMetadata, FieldMetadataPlain, IntegrationFieldName } from '../../../../common';
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
      await this.fieldsExtractor({ integration, dataset })
        .then(this.mapExtractedFieldsToFieldMetadataInstances)
        .then((fieldMetadataTree) => this.storeFieldsInCache(fieldMetadataTree, integration));

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

  private getCachedField(
    fieldName: IntegrationFieldName,
    { integration, dataset }: IntegrationFieldsSearchParams
  ): FieldMetadata | undefined {
    const cachedIntegration = this.cache.get(integration);

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
    extractedFieldsMetadata: Record<string, Record<string, FieldMetadata>>,
    integration: string
  ): void => {
    const cachedIntegration = this.cache.get(integration);

    if (!cachedIntegration) {
      this.cache.set(integration, extractedFieldsMetadata);
    } else {
      this.cache.set(integration, { ...cachedIntegration, ...extractedFieldsMetadata });
    }
  };

  private mapExtractedFieldsToFieldMetadataInstances = (
    extractedFields: Record<string, Record<string, FieldMetadataPlain>>
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
