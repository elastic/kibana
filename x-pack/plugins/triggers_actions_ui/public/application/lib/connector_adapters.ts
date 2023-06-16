/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import type { RuleNotifyWhenType } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export type ConnectorAdapterActionGroup = 'active' | 'recovered';
export interface ConnectorAdapterConfig {
  connectorTypeId: string;
  limitActionGroups?: ConnectorAdapterActionGroup[];
  limitPerAlertActionFrequency?: RuleNotifyWhenType[];
  allowThrottledSummaries?: boolean;
}

export async function loadConnectorAdapters({
  http,
}: {
  http: HttpSetup;
}): Promise<ConnectorAdapterConfig[]> {
  return (await http.get(
    `${INTERNAL_BASE_ALERTING_API_PATH}/_connector_adapters`
  )) as ConnectorAdapterConfig[];
}
