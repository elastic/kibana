/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CALL_OUT_UNAUTHORIZED_MSG = i18n.translate(
  'xpack.securitySolution.timeline.callOut.unauthorized.message.description',
  {
    defaultMessage:
      'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.',
  }
);

export const CALL_OUT_IMMUTIABLE = i18n.translate(
  'xpack.securitySolution.timeline.callOut.immutable.message.description',
  {
    defaultMessage:
      'This timeline is immutable, therefore not allowed to save it within the security application, though you may continue to use the timeline to search and filter security events',
  }
);
