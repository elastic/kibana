/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { DEFAULT_ALLOWED_LOGS_BASE_PATTERNS } from '@kbn/discover-utils';
import { DataViewSpecWithId } from '../../data_source_selection';
import { DataViewDescriptorType } from '../types';

const LOGS_ALLOWED_LIST = [
  createRegExpPatternFrom(DEFAULT_ALLOWED_LOGS_BASE_PATTERNS),
  // Add more strings or regex patterns as needed
];

type DataViewDescriptorFactoryParams = Omit<DataViewDescriptorType, 'kibanaSpaces'> & {
  namespaces?: string[];
};

export class DataViewDescriptor {
  id: DataViewDescriptorType['id'];
  dataType: DataViewDescriptorType['dataType'];
  kibanaSpaces: DataViewDescriptorType['kibanaSpaces'];
  name: DataViewDescriptorType['name'];
  title: DataViewDescriptorType['title'];
  type: DataViewDescriptorType['type'];

  private constructor(dataViewDescriptor: DataViewDescriptorType) {
    this.id = dataViewDescriptor.id;
    this.dataType = dataViewDescriptor.dataType;
    this.kibanaSpaces = dataViewDescriptor.kibanaSpaces;
    this.name = dataViewDescriptor.name;
    this.title = dataViewDescriptor.title;
    this.type = dataViewDescriptor.type;
  }

  getFullTitle() {
    return this.name;
  }

  toDataviewSpec(): DataViewSpecWithId {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
    };
  }

  toPlain() {
    return {
      id: this.id,
      dataType: this.dataType,
      name: this.name,
      title: this.title,
    };
  }

  testAgainstAllowedList(allowedList: string[]) {
    return this.title
      ? testPatternAgainstAllowedList([createRegExpPatternFrom(allowedList)])(this.title)
      : false;
  }

  public static create({ id, namespaces, title, type, name }: DataViewDescriptorFactoryParams) {
    const nameWithFallbackTitle = name ?? title;
    const dataType = title ? DataViewDescriptor.#extractDataType(title) : 'unresolved';
    const kibanaSpaces = namespaces;

    return new DataViewDescriptor({
      id,
      dataType,
      kibanaSpaces,
      name: nameWithFallbackTitle,
      title,
      type,
    });
  }

  static #extractDataType(title: string): DataViewDescriptorType['dataType'] {
    if (testPatternAgainstAllowedList(LOGS_ALLOWED_LIST)(title)) {
      return 'logs';
    }

    return 'unknown';
  }

  public isLogsDataType() {
    return this.dataType === 'logs';
  }

  public isUnknownDataType() {
    return this.dataType === 'unknown';
  }

  public isUnresolvedDataType() {
    return this.dataType === 'unresolved';
  }
}
