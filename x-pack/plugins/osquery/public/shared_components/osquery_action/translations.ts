/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHORT_EMPTY_TITLE = i18n.translate('xpack.osquery.action.shortEmptyTitle', {
  defaultMessage: 'Osquery is not available',
});

export const EMPTY_PROMPT = i18n.translate('xpack.osquery.action.empty', {
  defaultMessage:
    'An Elastic Agent is not installed on this host. To run queries, install Elastic Agent on the host, and then add the Osquery Manager integration to the agent policy in Fleet.',
});
export const PERMISSION_DENIED = i18n.translate('xpack.osquery.action.permissionDenied', {
  defaultMessage: 'Permission denied',
});

export const NOT_AVAILABLE = i18n.translate('xpack.osquery.action.unavailable', {
  defaultMessage:
    'The Osquery Manager integration is not added to the agent policy. To run queries on the host, add the Osquery Manager integration to the agent policy in Fleet.',
});
export const AGENT_STATUS_ERROR = i18n.translate('xpack.osquery.action.agentStatus', {
  defaultMessage:
    'To run queries on this host, the Elastic Agent must be active. Check the status of this agent in Fleet.',
});
