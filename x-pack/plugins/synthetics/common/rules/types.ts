/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexConnectorTypeId,
  JiraConnectorTypeId,
  PagerDutyConnectorTypeId,
  ServerLogConnectorTypeId,
  ServiceNowITSMConnectorTypeId as ServiceNowConnectorTypeId,
  SlackConnectorTypeId,
  TeamsConnectorTypeId,
  WebhookConnectorTypeId,
  EmailConnectorTypeId,
} from '@kbn/stack-connectors-plugin/server/connector_types';

import type { ActionConnector as RawActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

export type ActionTypeId =
  | typeof SlackConnectorTypeId
  | typeof PagerDutyConnectorTypeId
  | typeof ServerLogConnectorTypeId
  | typeof IndexConnectorTypeId
  | typeof TeamsConnectorTypeId
  | typeof ServiceNowConnectorTypeId
  | typeof JiraConnectorTypeId
  | typeof WebhookConnectorTypeId
  | typeof EmailConnectorTypeId;

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;
