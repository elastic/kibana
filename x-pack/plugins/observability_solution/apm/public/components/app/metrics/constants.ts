/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgSrc: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.metricsTitle', {
    defaultMessage: 'View core metrics for your application',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.metricsContent', {
    defaultMessage:
      'View metric trends for the instances of your service to identify performance bottlenecks that could be affecting your users.',
  }),
  imgSrc: 'TBD',
};
