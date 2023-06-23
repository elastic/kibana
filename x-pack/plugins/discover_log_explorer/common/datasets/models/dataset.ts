/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetId, DatasetType, IntegrationType } from '../types';

type IntegrationBase = Pick<IntegrationType, 'name' | 'version'>;

interface DatasetSpec {
  id: DatasetId;
  name: DatasetType['title'];
  title: DatasetType['name'];
}

export class Dataset {
  id: DatasetId;
  name: DatasetType['name'];
  title: DatasetType['title'];
  parentIntegration?: IntegrationBase;

  private constructor(dataset: DatasetType, parentIntegration?: IntegrationType) {
    this.id = `dataset-${dataset.name}` as DatasetId;
    this.name = dataset.name;
    this.title = dataset.title ?? dataset.name;
    this.parentIntegration = parentIntegration && {
      name: parentIntegration.name,
      version: parentIntegration.version,
    };
  }

  toSpec(): DatasetSpec {
    // Invert the property because the API returns the index pattern as `name` and a readable name as `title`
    return {
      id: this.id,
      name: this.title,
      title: this.name,
    };
  }

  public static create(dataset: DatasetType, parentIntegration?: IntegrationType) {
    return new Dataset(dataset, parentIntegration);
  }
}
