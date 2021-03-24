/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http as httpService } from './http_service';
import { getSavedObjectsClient } from '../kibana_services';

export const getExistingIndexNames = async () => {
  const indexes = await httpService({
    url: `/api/index_management/indices`,
    method: 'GET',
  });
  return indexes ? indexes.map(({ name }) => name) : [];
};

export const getExistingIndexPatternNames = async () => {
  const indexPatterns = await getSavedObjectsClient()
    .find({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then(({ savedObjects }) => savedObjects.map((savedObject) => savedObject.get('title')));
  return indexPatterns ? indexPatterns.map(({ name }) => name) : [];
};

export function checkIndexPatternValid(name) {
  const byteLength = encodeURI(name).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1;
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  const indexPatternInvalid =
    byteLength > 255 || // name can't be greater than 255 bytes
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null; // name can't contain these chars
  return !indexPatternInvalid;
}
