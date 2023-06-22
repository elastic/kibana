/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetId, DatasetType, IntegrationType } from '../types';

type IntegrationBase = Pick<IntegrationType, 'name' | 'version'>;

interface DatasetDeps {
  dataset: DatasetType;
  integration?: IntegrationBase;
}

interface DatasetSpec {
  id: DatasetId;
  name: DatasetType['title'];
  title: DatasetType['name'];
}

export interface DatasetPlain {
  dataset: DatasetType & { id: DatasetId };
  integration?: IntegrationBase;
}

export interface IDataset {
  id: DatasetId;
  name: DatasetType['name'];
  title: DatasetType['title'];
  integration?: IntegrationBase;
  toPlain: () => DatasetPlain;
  toSpec: () => DatasetSpec;
}

export class Dataset implements IDataset {
  id: DatasetId;
  name: DatasetType['name'];
  title: DatasetType['title'];
  integration?: IntegrationBase;

  private constructor({ integration, dataset }: DatasetDeps) {
    this.id = `dataset-${dataset.name}` as DatasetId;
    this.name = dataset.name;
    this.title = dataset.title ?? dataset.name;
    this.integration = integration;
  }

  toPlain() {
    return {
      dataset: {
        id: this.id,
        name: this.name,
        title: this.title,
      },
      integration: this.integration,
    };
  }

  toSpec() {
    // Invert the property because the API returns the index pattern as `name` and a readable name as `title`
    return {
      id: this.id,
      name: this.title,
      title: this.name,
    };
  }

  public static create({ integration, dataset }: DatasetDeps) {
    return new Dataset({ integration, dataset });
  }
}
