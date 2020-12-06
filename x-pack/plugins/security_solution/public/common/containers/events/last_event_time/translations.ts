/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_LAST_EVENT_TIME = i18n.translate(
  'xpack.securitySolution.lastEventTime.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on last event time search`,
  }
);

export const FAIL_LAST_EVENT_TIME = i18n.translate(
  'xpack.securitySolution.lastEventTime.failSearchDescription',
  {
    defaultMessage: `Failed to run search on last event time`,
  }
);
