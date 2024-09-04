/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const logsOnlyEmptyStateContent: { title: string; content: string } = {
  title: i18n.translate('xpack.apm.serviceTabContent.serviceTabEmptyState.overviewTitle', {
    defaultMessage: 'Detect and resolve issues faster with deep visibility into your application',
  }),
  content: i18n.translate('xpack.apm.serviceTabContent.serviceTabEmptyState.overviewContent', {
    defaultMessage:
      'Understanding your application performance, relationships and dependencies by instrumenting with APM.',
  }),
};
