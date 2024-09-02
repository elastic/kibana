/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'data_quality';
export const PLUGIN_NAME = i18n.translate('xpack.dataQuality.name', {
  defaultMessage: 'Data Set Quality',
});

export {
  DATA_QUALITY_URL_STATE_KEY,
  datasetQualityUrlSchemaV1,
  datasetQualityDetailsUrlSchemaV1,
} from './url_schema';
