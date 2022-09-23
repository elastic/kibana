/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ITelemetryEventsSender } from './sender';
import type { TelemetryEvent } from './types';
import type { ITelemetryReceiver } from './receiver';
import { tlog } from './helpers';

/**
 * Preview telemetry events sender for the telemetry route.
 * @see telemetry_detection_rules_preview_route
 */
export class PreviewTelemetryEventsSender implements ITelemetryEventsSender {
  /** Inner composite telemetry events sender */
  private composite: ITelemetryEventsSender;

  /** Axios local instance */
  private axiosInstance = axios.create();

  /** Last sent message */
  private sentMessages: string[] = [];

  /** Logger for this class  */
  private logger: Logger;

  constructor(logger: Logger, composite: ITelemetryEventsSender) {
    this.logger = logger;
    this.composite = composite;

    /**
     * Intercept the last message and save it for the preview within the lastSentMessage
     * Reject the request intentionally to stop from sending to the server
     */
    this.axiosInstance.interceptors.request.use((config) => {
      tlog(
        this.logger,
        `Intercepting telemetry', ${JSON.stringify(
          config.data
        )} and not sending data to the telemetry server`
      );
      const data = config.data != null ? [config.data] : [];
      this.sentMessages = [...this.sentMessages, ...data];
      return Promise.reject(new Error('Not sending to telemetry server'));
    });

    /**
     * Create a fake response for the preview on return within the error section.
     * @param error The error we don't do anything with
     * @returns The response resolved to stop the chain from continuing.
     */
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // create a fake response for the preview as if the server had sent it back to us
        const okResponse: AxiosResponse = {
          data: {},
          status: 200,
          statusText: 'ok',
          headers: {},
          config: {},
        };
        return Promise.resolve(okResponse);
      }
    );
  }

  public getSentMessages() {
    return this.sentMessages;
  }

  public setup(
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    return this.composite.setup(
      telemetryReceiver,
      telemetrySetup,
      taskManager,
      telemetryUsageCounter
    );
  }

  public getClusterID(): string | undefined {
    return this.composite.getClusterID();
  }

  public start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ): void {
    return this.composite.start(telemetryStart, taskManager, receiver);
  }

  public stop(): void {
    return this.composite.stop();
  }

  public async queueTelemetryEvents(events: TelemetryEvent[]) {
    const result = this.composite.queueTelemetryEvents(events);
    await this.composite.sendIfDue(this.axiosInstance);
    return result;
  }

  public getTelemetryUsageCluster(): UsageCounter | undefined {
    return this.composite.getTelemetryUsageCluster();
  }

  public isTelemetryOptedIn(): Promise<boolean> {
    return this.composite.isTelemetryOptedIn();
  }

  public isTelemetryServicesReachable(): Promise<boolean> {
    return this.composite.isTelemetryServicesReachable();
  }

  public sendIfDue(axiosInstance?: AxiosInstance): Promise<void> {
    return this.composite.sendIfDue(axiosInstance);
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return this.composite.processEvents(events);
  }

  public async sendOnDemand(channel: string, toSend: unknown[]) {
    const result = await this.composite.sendOnDemand(channel, toSend, this.axiosInstance);
    return result;
  }

  public getV3UrlFromV2(v2url: string, channel: string): string {
    return this.composite.getV3UrlFromV2(v2url, channel);
  }
}
