/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getDataViewsService } from './kibana_services';
import { checkIndexExists } from './api';

const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');

const byteLength = (indexName: string) => {
  return encodeURI(indexName).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1 > 255;
};

export function checkIndexPatternValid(indexName: string) {
  if (byteLength(indexName)) {
    return i18n.translate('xpack.fileUpload.indexNameLong', {
      defaultMessage:
        'Cannot be longer than 255 bytes (note it is bytes, so multi-byte characters will count towards the 255 limit faster).',
    });
  }

  if (indexName !== indexName.toLowerCase()) {
    return i18n.translate('xpack.fileUpload.indexNameLowercase', {
      defaultMessage: 'Index name should be lowercase.',
    });
  }

  if (indexName === '.' || indexName === '..') {
    return i18n.translate('xpack.fileUpload.indexNameNoDots', {
      defaultMessage: `Index name can't be . or ..`,
    });
  }

  if (indexName.match(/^[-_+]/) !== null) {
    return i18n.translate('xpack.fileUpload.indexNameNoCharsAtStart', {
      defaultMessage: `Index name can't start with these chars: - _ +`,
    });
  }

  if (indexName.match(reg) !== null) {
    return i18n.translate('xpack.fileUpload.indexNameNoSpecificChars', {
      defaultMessage: `Index name can't contain spaces or these chars: \ / * ? < > | , # "`,
    });
  }
}

export const validateIndexName = async (indexName: string) => {
  if (!indexName) {
    return i18n.translate('xpack.fileUpload.indexNameRequired', {
      defaultMessage: 'Index name required',
    });
  }

  const dataViewNames = await getDataViewsService().getTitles();
  if (dataViewNames.includes(indexName)) {
    return i18n.translate('xpack.fileUpload.dataViewAlreadyExistsErrorMessage', {
      defaultMessage: 'Data view already exists.',
    });
  }

  const indexExists = await checkIndexExists(indexName);
  if (indexExists) {
    return i18n.translate('xpack.fileUpload.indexNameAlreadyExistsErrorMessage', {
      defaultMessage: 'Index name already exists.',
    });
  }

  return checkIndexPatternValid(indexName);
};
