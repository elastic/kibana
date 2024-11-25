/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { CrowdstrikeInitRTRResponseSchema } from '../../../common/crowdstrike/schema';
import { CrowdstrikeInitRTRParams } from '../../../common/crowdstrike/types';

export class CrowdstrikeSessionManager {
  private currentBatchId: string | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private closeSessionTimeout: NodeJS.Timeout | null = null;

  constructor(
    private urls: { batchInitRTRSession: string },
    private apiRequest: <R>(
      req: SubActionRequestParams<R>,
      connectorUsageCollector: ConnectorUsageCollector,
      retried?: boolean
    ) => Promise<R>
  ) {}

  async initializeSession(
    payload: CrowdstrikeInitRTRParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<string> {
    if (!this.currentBatchId) {
      // Make a request to initialize the session
      const response = await this.apiRequest(
        {
          url: this.urls.batchInitRTRSession,
          method: 'post',
          data: {
            host_ids: payload.endpoint_ids,
          },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        connectorUsageCollector
      );

      this.currentBatchId = response.batch_id;

      // Start the refresh interval
      this.startRefreshInterval(connectorUsageCollector);
    }

    // Reset the close session timeout
    this.resetCloseSessionTimeout();

    return this.currentBatchId;
  }

  private startRefreshInterval(connectorUsageCollector: ConnectorUsageCollector) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.refreshSession(connectorUsageCollector);
    }, 5 * 60 * 1000); // Refresh every 5 minutes
  }

  private async refreshSession(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    await this.apiRequest(
      {
        url: this.urls.batchRefreshRTRSession,
        method: 'post',
        data: {
          batch_id: this.currentBatchId,
        },
        responseSchema: CrowdstrikeInitRTRResponseSchema,
      },
      connectorUsageCollector
    );
  }

  private resetCloseSessionTimeout() {
    if (this.closeSessionTimeout) {
      clearTimeout(this.closeSessionTimeout);
    }

    this.closeSessionTimeout = setTimeout(() => {
      this.terminateSession();
    }, 10 * 60 * 1000); // Close session after 10 minutes of inactivity
  }

  private async terminateSession(): Promise<void> {
    // Clear intervals and timeouts
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.closeSessionTimeout) {
      clearTimeout(this.closeSessionTimeout);
      this.closeSessionTimeout = null;
    }
  }
}
