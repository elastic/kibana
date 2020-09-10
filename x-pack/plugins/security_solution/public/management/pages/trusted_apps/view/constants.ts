/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TrustedApp } from '../../../../../common/endpoint/types';

export const OS_TITLES: Readonly<{ [K in TrustedApp['os']]: string }> = {
  windows: i18n.translate('xpack.securitySolution.trustedapps.os.windows', {
    defaultMessage: 'Windows',
  }),
  macos: i18n.translate('xpack.securitySolution.trustedapps.os.macos', {
    defaultMessage: 'Mac OS',
  }),
  linux: i18n.translate('xpack.securitySolution.trustedapps.os.linux', {
    defaultMessage: 'Linux',
  }),
};
