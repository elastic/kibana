/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const MAINTENANCE_WINDOWS = i18n.translate('xpack.alerting.maintenanceWindows', {
  defaultMessage: 'Maintenance Windows',
});

export const MAINTENANCE_WINDOWS_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindows.description',
  {
    defaultMessage: 'Supress notifications for scheduled periods of time.',
  }
);

export const EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.alerting.maintenanceWindows.emptyPrompt.button',
  {
    defaultMessage: 'Create a maintenance window',
  }
);

export const EMPTY_PROMPT_DOCUMENTATION = i18n.translate(
  'xpack.alerting.maintenanceWindows.emptyPrompt.documentation',
  {
    defaultMessage: 'Documentation',
  }
);

export const EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.alerting.maintenanceWindows.emptyPrompt.title',
  {
    defaultMessage: 'Create your first maintenance window',
  }
);

export const EMPTY_PROMPT_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindows.emptyPrompt.description',
  {
    defaultMessage: 'Supress notifications while marking associated alerts as `Under Maintenance`',
  }
);

export const CREATE = i18n.translate('xpack.observability.breadcrumbs.sloEditLinkText', {
  defaultMessage: 'Create',
});
