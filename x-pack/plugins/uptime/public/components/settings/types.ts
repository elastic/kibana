/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndexActionTypeId,
  JiraActionTypeId,
  PagerDutyActionTypeId,
  ServerLogActionTypeId,
  ServiceNowITSMActionTypeId as ServiceNowActionTypeId,
  SlackActionTypeId,
  TeamsActionTypeId,
  WebhookActionTypeId,
  EmailActionTypeId,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../actions/server/builtin_action_types';

export type ActionTypeId =
  | typeof SlackActionTypeId
  | typeof PagerDutyActionTypeId
  | typeof ServerLogActionTypeId
  | typeof IndexActionTypeId
  | typeof TeamsActionTypeId
  | typeof ServiceNowActionTypeId
  | typeof JiraActionTypeId
  | typeof WebhookActionTypeId
  | typeof EmailActionTypeId;
