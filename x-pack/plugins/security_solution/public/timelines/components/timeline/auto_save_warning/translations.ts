/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.securitySolution.timeline.autosave.warning.title', {
  defaultMessage: 'Auto-save disabled until refresh',
});

export const DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.autosave.warning.description',
  {
    defaultMessage:
      'Another user has made changes to this timeline. Any changes you make will not be auto-saved until you have refreshed this timeline to absorb those changes.',
  }
);

export const REFRESH_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.autosave.warning.refresh.title',
  {
    defaultMessage: 'Refresh timeline',
  }
);
