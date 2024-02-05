/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../constants';
import { DataViewSpecWithId } from '../../dataset_selection';
import { DataViewDescriptorType } from '../types';
import { buildIndexPatternRegExp } from '../utils';

type Whitelist = Array<string | RegExp>;

const LOGS_WHITELIST: Whitelist = [
  buildIndexPatternRegExp(['logs', 'auditbeat', 'filebeat', 'winbeat']),
  // Add more strings or regex patterns as needed
];

export class DataViewDescriptor {
  id: DataViewDescriptorType['id'];
  dataType: DataViewDescriptorType['dataType'];
  name: DataViewDescriptorType['name'];
  namespaces: DataViewDescriptorType['namespaces'];
  title: DataViewDescriptorType['title'];
  type: DataViewDescriptorType['type'];

  private constructor(dataViewDescriptor: DataViewDescriptorType) {
    this.id = dataViewDescriptor.id;
    this.dataType = dataViewDescriptor.dataType;
    this.name = dataViewDescriptor.name;
    this.namespaces = dataViewDescriptor.namespaces;
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
      timeFieldName: TIMESTAMP_FIELD,
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

  public static create(dataViewListItem: DataViewListItem) {
    const name = dataViewListItem.name ?? dataViewListItem.title;
    const dataType = DataViewDescriptor.#extractDataType(dataViewListItem.title);

    return new DataViewDescriptor({ ...dataViewListItem, dataType, name });
  }

  static #extractDataType(title: string): DataViewDescriptorType['dataType'] {
    if (testAgainstWhitelist(title, LOGS_WHITELIST)) {
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
}

function testAgainstWhitelist(value: string, whitelist: Whitelist) {
  for (const allowedItem of whitelist) {
    if (typeof allowedItem === 'string') {
      return value === allowedItem;
    }
    if (allowedItem instanceof RegExp) {
      return allowedItem.test(value);
    }
  }

  // If no match is found in the whitelist, return false
  return false;
}
