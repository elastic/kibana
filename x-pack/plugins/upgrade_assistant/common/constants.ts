/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NEXT_MAJOR_VERSION } from './version';

export const PLUGIN = {
  title: i18n.translate('xpack.upgradeAssistant.appTitle', {
    defaultMessage: '{version} Upgrade Assistant',
    values: { version: `${NEXT_MAJOR_VERSION}.0` },
  }),
};
