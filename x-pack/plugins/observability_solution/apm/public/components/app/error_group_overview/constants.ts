/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgSrc: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewTitle', {
    defaultMessage: 'Identify transaction errors with your applications',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewContent', {
    defaultMessage:
      'Analyse errors down to the specific transaction to pin-point specific errors within your service.',
  }),
  imgSrc: 'TBD',
};
