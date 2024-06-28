/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN = {
  APP_ROOT_ID: 'react-uptime-root',
  DESCRIPTION: i18n.translate('xpack.synthetics.pluginDescription', {
    defaultMessage: 'Synthetics monitoring',
    description: 'The description text that will appear in the feature catalogue.',
  }),
  ID: 'uptime',
  SYNTHETICS_PLUGIN_ID: 'synthetics',
  LOCAL_STORAGE_KEY: 'xpack.synthetics.',
  NAME: i18n.translate('xpack.synthetics.featureRegistry.syntheticsFeatureName', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  TITLE: i18n.translate('xpack.synthetics.uptimeFeatureCatalogueTitle', {
    defaultMessage: 'Uptime',
  }),
  SYNTHETICS: i18n.translate('xpack.synthetics.syntheticsFeatureCatalogueTitle', {
    defaultMessage: 'Synthetics',
  }),
};
