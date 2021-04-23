/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { http as httpService } from './http_service';
import { getIndexPatternService } from '../kibana_services';

export const getExistingIndexNames = _.debounce(async () => {
  const indexes = await httpService({
    url: `/api/index_management/indices`,
    method: 'GET',
  });
  return indexes ? indexes.map(({ name }: { name: string }) => name) : [];
}, 10000, { leading: true });

export function checkIndexPatternValid(name: string) {
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

export const validateIndexName = async (indexName: string) => {
  const indexNames = await getExistingIndexNames();
  const indexPatternNames = await getIndexPatternService().getTitles();
  const indexNamesAndPatterns = [...indexNames, ...indexPatternNames];
  let indexNameError;
  if (indexNamesAndPatterns.includes(indexName)) {
    indexNameError = i18n.translate(
      'xpack.fileUpload.util.indexingService.indexNameAlreadyExistsErrorMessage',
      {
        defaultMessage: 'Index name already exists.',
      }
    );
  } else if (!checkIndexPatternValid(indexName)) {
    indexNameError = i18n.translate(
      'xpack.fileUpload.util.indexingService.indexNameContainsIllegalCharactersErrorMessage',
      {
        defaultMessage: 'Index name contains illegal characters.',
      }
    );
  }
  return indexNameError;
};
