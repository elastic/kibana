/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../../../common/constants';

const LOGGING_TAGS = [LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG];

/*
 * @param {Object} server
 * @return {Object} helpful logger object
 */
export function getCollectorLogger(server) {
  return {
    debug: message => server.log(['debug', ...LOGGING_TAGS], message),
    info: message => server.log(['info', ...LOGGING_TAGS], message),
    warn: message => server.log(['warning', ...LOGGING_TAGS], message)
  };
}
