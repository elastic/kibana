/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TIMELINE_EVENTS = i18n.translate(
  'xpack.timelines.timelineEvents.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on timeline events search`,
  }
);

export const FAIL_TIMELINE_EVENTS = i18n.translate(
  'xpack.timelines.timelineEvents.failSearchDescription',
  {
    defaultMessage: `Failed to run search on timeline events`,
  }
);

export const ERROR_RUNTIME_FIELD_TIMELINE_EVENTS = i18n.translate(
  'xpack.timelines.timelineEvents.errorRuntimeFieldSearchDescription',
  {
    defaultMessage: 'Runtime field error',
  }
);

export const ERROR_RUNTIME_FIELD_RESET_SORT = i18n.translate(
  'xpack.timelines.timelineEvents.errorRuntimeFieldSearchButton',
  {
    defaultMessage: 'Reset sort',
  }
);
