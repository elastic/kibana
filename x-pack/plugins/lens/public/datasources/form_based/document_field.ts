/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DOCUMENT_FIELD_NAME } from '../../../common';
import type { IndexPatternField } from '../../types';

const customLabel = i18n.translate('xpack.lens.indexPattern.records', {
  defaultMessage: 'Records',
});

/**
 * This is a special-case field which allows us to perform
 * document-level operations such as count.
 */
export const documentField: IndexPatternField = {
  displayName: customLabel,
  customLabel,
  name: DOCUMENT_FIELD_NAME,
  type: 'document',
  aggregatable: true,
  searchable: true,
};
