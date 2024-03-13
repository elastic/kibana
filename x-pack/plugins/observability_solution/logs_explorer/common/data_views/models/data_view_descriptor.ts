/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALLOWED_LOGS_DATA_VIEWS } from '../../constants';
import { DataViewSpecWithId } from '../../data_source_selection';
import { DataViewDescriptorType } from '../types';
import { buildIndexPatternRegExp } from '../utils';

type AllowedList = Array<string | RegExp>;

const LOGS_ALLOWED_LIST: AllowedList = [
  buildIndexPatternRegExp(DEFAULT_ALLOWED_LOGS_DATA_VIEWS),
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
    return this.title ? isAllowed(this.title, [buildIndexPatternRegExp(allowedList)]) : false;
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
    if (isAllowed(title, LOGS_ALLOWED_LIST)) {
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

function isAllowed(value: string, allowList: AllowedList) {
  for (const allowedItem of allowList) {
    if (typeof allowedItem === 'string') {
      return value === allowedItem;
    }
    if (allowedItem instanceof RegExp) {
      return allowedItem.test(value);
    }
  }

  // If no match is found in the allowList, return false
  return false;
}
