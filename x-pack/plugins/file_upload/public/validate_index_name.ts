/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getIndexPatternService } from './kibana_services';
import { checkIndexExists } from './api';

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
  if (!indexName) {
    return i18n.translate('xpack.fileUpload.indexNameRequired', {
      defaultMessage: 'Index name required',
    });
  }

  if (!checkIndexPatternValid(indexName)) {
    return i18n.translate('xpack.fileUpload.indexNameContainsIllegalCharactersErrorMessage', {
      defaultMessage: 'Index name contains illegal characters.',
    });
  }

  const indexPatternNames = await getIndexPatternService().getTitles();
  if (indexPatternNames.includes(indexName)) {
    return i18n.translate('xpack.fileUpload.indexPatternAlreadyExistsErrorMessage', {
      defaultMessage: 'Data view already exists.',
    });
  }

  const indexExists = await checkIndexExists(indexName);
  if (indexExists) {
    return i18n.translate('xpack.fileUpload.indexNameAlreadyExistsErrorMessage', {
      defaultMessage: 'Index name already exists.',
    });
  }
};
