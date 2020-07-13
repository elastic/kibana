/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN_ID = 'ingest_pipelines';

export const PLUGIN_I18N_NAME = i18n.translate('xpack.ingestPipelines.appTitle', {
  defaultMessage: 'Ingest Node Pipelines',
});

export const PLUGIN_MIN_LICENSE_TYPE = basicLicense;

export const BASE_PATH = '/';

export const API_BASE_PATH = '/api/ingest_pipelines';

export const APP_CLUSTER_REQUIRED_PRIVILEGES = ['manage_pipeline', 'cluster:monitor/nodes/info'];
