/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLATINUM = i18n.translate('xpack.securitySolution.paywall.platinum', {
  defaultMessage: 'Platinum',
});

export const UPGRADE_CTA = i18n.translate('xpack.securitySolution.paywall.upgradeButton', {
  defaultMessage: 'Available from Platinum',
});

export const UPGRADE_MESSAGE = (description?: string) =>
  i18n.translate('xpack.securitySolution.paywall.upgradeMessage', {
    values: { description: description ? description : 'this feature' },
    defaultMessage:
      'To turn use {description}, you must upgrade your license to Platinum, start a free 30-days trial, or spin up a cloud deployment on AWS, GCP, or Azure.',
  });

export const UPGRADE_BUTTON = i18n.translate('xpack.securitySolution.paywall.upgradeCta', {
  defaultMessage: 'Upgrade to Platinum',
});
