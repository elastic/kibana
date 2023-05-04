/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COUNT_TABLE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.count.countTableColumnTitle',
  {
    defaultMessage: 'Count of records',
  }
);

export const COUNT_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.count.countTableTitle',
  {
    defaultMessage: 'Count',
  }
);

export const COLUMN_LABEL = ({ fieldName, topN }: { fieldName: string; topN: number }) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.count.columnLabel', {
    values: { fieldName, topN },
    defaultMessage: 'Top {topN} values of {fieldName}',
  });

export * from '../common/translations';
