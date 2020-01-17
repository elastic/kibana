/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export { TimeBuckets } from './time_buckets';

export const MANAGEMENT_BREADCRUMB = Object.freeze({
  text: i18n.translate('xpack.watcher.management.breadcrumb', {
    defaultMessage: 'Management',
  }),
  href: '#/management',
});
