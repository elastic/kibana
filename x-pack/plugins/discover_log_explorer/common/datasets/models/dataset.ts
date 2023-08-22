/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconType } from '@elastic/eui';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { IndexPattern } from '@kbn/io-ts-utils';
import { DatasetId, DatasetType, IntegrationType } from '../types';

type IntegrationBase = Pick<IntegrationType, 'name' | 'title' | 'icons' | 'version'>;

interface DatasetDeps extends DatasetType {
  iconType?: IconType;
}

export class Dataset {
  id: DatasetId;
  iconType?: IconType;
  name: DatasetType['name'];
  title: string;
  parentIntegration?: IntegrationBase;

  private constructor(dataset: DatasetDeps, parentIntegration?: IntegrationBase) {
    this.id = `dataset-${dataset.name}` as DatasetId;
    this.iconType = dataset.iconType;
    this.name = dataset.name;
    this.title = dataset.title ?? dataset.name;
    this.parentIntegration = parentIntegration && {
      name: parentIntegration.name,
      title: parentIntegration.title,
      icons: parentIntegration.icons,
      version: parentIntegration.version,
    };
  }

  getFullTitle(): string {
    return this.parentIntegration?.title
      ? `[${this.parentIntegration.title}] ${this.title}`
      : this.title;
  }

  getDatasetWildcard(): IndexPattern {
    const [type, dataset, _namespace] = this.name.split('-');

    return `${type}-${dataset}-*` as IndexPattern;
  }

  toDataviewSpec(): DataViewSpec {
    // Invert the property because the API returns the index pattern as `name` and a readable name as `title`
    return {
      id: this.id,
      name: this.getFullTitle(),
      title: this.name as string,
    };
  }

  toPlain() {
    return {
      name: this.name,
      title: this.title,
    };
  }

  public static create(dataset: DatasetDeps, parentIntegration?: IntegrationBase) {
    return new Dataset(dataset, parentIntegration);
  }

  public static createAllLogsDataset() {
    return new Dataset({
      name: 'logs-*-*' as IndexPattern,
      title: 'All log datasets',
      iconType: 'editorChecklist',
    });
  }

  public static createWildcardDatasetsFrom(datasets: Dataset[]) {
    // Gather unique list of wildcards
    const wildcards = datasets.reduce(
      (list, dataset) => list.add(dataset.getDatasetWildcard()),
      new Set<IndexPattern>()
    );

    // Create new datasets for the retrieved wildcards
    return Array.from(wildcards).map((wildcard) => Dataset.create({ name: wildcard }));
  }
}
