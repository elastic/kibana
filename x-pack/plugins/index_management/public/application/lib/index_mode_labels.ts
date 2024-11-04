/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getIndexModeLabel = (mode?: string | null) => {
  switch (mode) {
    case 'standard':
    case null:
    case undefined:
      return i18n.translate('xpack.idxMgmt.indexModeLabels.standardModeLabel', {
        defaultMessage: 'Standard',
      });
    case 'logsdb':
      return i18n.translate('xpack.idxMgmt.indexModeLabels.logsdbModeLabel', {
        defaultMessage: 'LogsDB',
      });
    case 'time_series':
      return i18n.translate('xpack.idxMgmt.indexModeLabels.tsdbModeLabel', {
        defaultMessage: 'Time series',
      });
    default:
      return mode;
  }
};
