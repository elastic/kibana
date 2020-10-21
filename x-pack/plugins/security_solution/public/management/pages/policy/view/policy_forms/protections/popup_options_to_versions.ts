/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const popupVersions: Array<[string, string]> = [
  [
    'malware',
    i18n.translate('xpack.securitySolution.endpoint.policyDetails.popup.version.7.11', {
      defaultMessage: '7.11+',
    }),
  ],
];

export const popupVersionsMap = new Map<string, string>(popupVersions);
