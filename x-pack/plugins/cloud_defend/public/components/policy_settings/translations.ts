/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const enableControl = i18n.translate('xpack.cloudDefend.enableControl', {
  defaultMessage: 'Enable drift prevention',
});

export const enableControlHelp = i18n.translate('xpack.cloudDefend.enableControlHelp', {
  defaultMessage:
    'Toggles enablement of drift prevention policy to alert and/or block file operations.',
});
