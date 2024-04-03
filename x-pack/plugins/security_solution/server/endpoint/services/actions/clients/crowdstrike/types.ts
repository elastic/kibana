/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';

type ConnectorActionsExecuteOptions = Parameters<ActionsClient['execute']>[0];

interface CrowdstrikeConnectorExecuteParams<
  P extends Record<string, unknown> = Record<string, unknown>
> {
  subAction: SUB_ACTION;
  subActionParams: P;
}
