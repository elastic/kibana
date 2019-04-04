/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';

chrome.badge.addNamedBadge('readOnly', {
  text: i18n.translate('xpack.security.badges.readOnly.text', {
    defaultMessage: 'Read Only',
  }),
  tooltip: i18n.translate('xpack.security.badges.readOnly.tooltip', {
    defaultMessage: `You're not authorized to save changes.`,
  }),
});
