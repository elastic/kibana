/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract } from '@kbn/actions-plugin/server';
import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import type { CoreStart, Plugin } from '@kbn/core/server';

/**
 * In-memory inbound webhooks. The hub takes a Kibana API key or a service-account
 * bearer only when the connector is events-on and has no saved ingest identity.
 * Keep these ids aligned with the Scout specs under workflows_management/test/scout_inbound_hub.
 */
export const INBOUND_HUB_API_KEY_CONNECTOR_ID = 'inbound-hub-api-key';
export const INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID = 'inbound-hub-service-account';

const CONNECTOR_IDS = [
  INBOUND_HUB_API_KEY_CONNECTOR_ID,
  INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID,
] as const;

interface StartDependencies {
  actions: PluginStartContract;
}

export class InboundHubTestPlugin
  implements Plugin<void, void, StartDependencies, StartDependencies>
{
  public setup(): void {}

  public start(_core: CoreStart, { actions }: StartDependencies): void {
    for (const id of CONNECTOR_IDS) {
      const registered = actions.registerDynamicConnector({
        id,
        actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        name: id,
        config: { authType: 'none' },
        secrets: { authType: 'none' },
        isMissingSecrets: false,
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isInboundEventsEnabled: true,
      });
      if (!registered) {
        throw new Error(`Inbound hub test plugin could not register connector ${id}`);
      }
    }
  }

  public stop(): void {}
}
