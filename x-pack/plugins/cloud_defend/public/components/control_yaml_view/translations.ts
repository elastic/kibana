/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const errorAlertActionRequired = i18n.translate('xpack.cloudDefend.alertActionRequired', {
  defaultMessage:
    '[Technical Preview] The "alert" action is required on all responses. This restriction will be removed once all responses become auditable.',
});

export const controlYamlHelp = i18n.translate('xpack.cloudDefend.controlYamlHelp', {
  defaultMessage:
    'Configure BPF/LSM controls by creating selectors, and responses below. To learn more click <here>',
});
