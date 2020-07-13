/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LICENSE_TYPE_GOLD, LicenseType } from '../../../../legacy/common/constants';

export const PLUGIN = {
  ID: 'watcher',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_GOLD as LicenseType,
  title: i18n.translate('xpack.watcher.appName', {
    defaultMessage: 'Watcher',
  }),
};
