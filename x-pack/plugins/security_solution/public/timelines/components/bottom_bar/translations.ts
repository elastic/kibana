/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.bottomBar.addButtonLabel',
  {
    defaultMessage: 'Add new timeline or template',
  }
);
export const NEW_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.bottomBar.newTimelineButtonLabel',
  {
    defaultMessage: 'Create new Timeline',
  }
);
export const NEW_TEMPLATE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.bottomBar.newTemplateTimelineButtonLabel',
  {
    defaultMessage: 'Create new Timeline template',
  }
);
export const OPEN_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.bottomBar.openTimelineButtonLabel',
  {
    defaultMessage: 'Open Timeline…',
  }
);

export const OPEN_TIMELINE_BUTTON = (title: string) =>
  i18n.translate('xpack.securitySolution.timeline.bottomBar.toggleButtonAriaLabel', {
    values: { title },
    defaultMessage: 'Open timeline {title}',
  });
