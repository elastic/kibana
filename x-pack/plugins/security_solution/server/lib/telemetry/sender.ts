/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import axios, { AxiosInstance } from 'axios';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SecuritySolutionCustomShipper } from './custom_shipper';
import { ITelemetryReceiver } from './receiver';
import { copyAllowlistedFields, endpointAllowlistFields } from './filterlists';
import { createTelemetryTaskConfigs } from './tasks';
import { createUsageCounterLabel } from './helpers';
import type { TelemetryEvent } from './types';
import {
  INSIGHTS_CHANNEL,
  LIST_DETECTION_RULE_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_ENDPOINT_EXCEPTION,
  LIST_TRUSTED_APPLICATION,
  TELEMETRY_CHANNEL_DETECTION_ALERTS,
  TELEMETRY_CHANNEL_ENDPOINT_META,
  TELEMETRY_CHANNEL_LISTS,
} from './constants';
import { SecurityTelemetryTask, SecurityTelemetryTaskConfig } from './task';

const usageLabelPrefix: string[] = ['security_telemetry', 'sender'];

export interface ITelemetryEventsSender {
  setup(
    analytics: AnalyticsServiceSetup,
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ): void;

  getClusterID(): string | undefined;

  start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ): void;

  stop(): void;
  queueTelemetryEvents(events: TelemetryEvent[]): void;
  isTelemetryOptedIn(): Promise<boolean>;
  processEvents(events: TelemetryEvent[]): TelemetryEvent[];
  sendOnDemand(channel: string, toSend: unknown[], axiosInstance?: AxiosInstance): Promise<void>;
  getV3UrlFromV2(v2url: string, channel: string): string;
}

export class TelemetryEventsSender implements ITelemetryEventsSender {
  private readonly logger: Logger;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private receiver: ITelemetryReceiver | undefined;
  private isOptedIn?: boolean = true; // Assume true until the first check

  private telemetryUsageCounter?: UsageCounter;
  private telemetryTasks?: SecurityTelemetryTask[];

  private analyticsClient?: Pick<AnalyticsServiceSetup, 'reportEvent'>;

  constructor(logger: Logger, private readonly version: string) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(
    analytics: AnalyticsServiceSetup,
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    this.analyticsClient = analytics;
    const allSecuritySolutionEvents = [
      TELEMETRY_CHANNEL_LISTS,
      TELEMETRY_CHANNEL_ENDPOINT_META,
      TELEMETRY_CHANNEL_DETECTION_ALERTS,
      LIST_DETECTION_RULE_EXCEPTION,
      LIST_ENDPOINT_EXCEPTION,
      LIST_ENDPOINT_EVENT_FILTER,
      LIST_TRUSTED_APPLICATION,
      INSIGHTS_CHANNEL,
      // ...
    ];

    analytics.registerShipper(
      SecuritySolutionCustomShipper,
      {
        channelName: 'security_solutions_shipper',
        sendTo: 'staging', // or `production` depending on the telemetry config
        version: this.version,
      },
      {
        // This tells the client it should only forward these types of events to this forwarder
        exclusiveEventTypes: allSecuritySolutionEvents,
      }
    );

    // Register all the events.
    allSecuritySolutionEvents.forEach((eventType) => {
      analytics.registerEventType({
        eventType,
        schema: {
          security_solution_payload: {
            type: 'pass_through',
            _meta: {
              description: 'Blah, blah, blah',
            },
          },
        },
      });
    });

    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;

    if (taskManager) {
      this.telemetryTasks = createTelemetryTaskConfigs().map(
        (config: SecurityTelemetryTaskConfig) => {
          const task = new SecurityTelemetryTask(config, this.logger, this, telemetryReceiver);
          task.register(taskManager);
          return task;
        }
      );
    }
  }

  public getClusterID(): string | undefined {
    return this.receiver?.getClusterInfo()?.cluster_uuid;
  }

  public start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ) {
    this.telemetryStart = telemetryStart;
    this.receiver = receiver;

    if (taskManager && this.telemetryTasks) {
      this.logger.debug(`Starting security telemetry tasks`);
      this.telemetryTasks.forEach((task) => task.start(taskManager));
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  public queueTelemetryEvents(events: TelemetryEvent[]) {
    this.processEvents(events).forEach((event) => {
      // How can we know the event type from the event?
      const eventType = event.data_stream?.dataset ?? `security_solution_event`;
      // Report event to the client.
      this.analyticsClient?.reportEvent(eventType, event);
    });
  }

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return events.map(function (obj: TelemetryEvent): TelemetryEvent {
      return copyAllowlistedFields(endpointAllowlistFields, obj);
    });
  }

  /**
   * This function sends events to the elastic telemetry channel. Caution is required
   * because it does no allowlist filtering at send time. The function call site is
   * responsible for ensuring sure no sensitive material is in telemetry events.
   *
   * @param channel the elastic telemetry channel
   * @param toSend telemetry events
   */
  public async sendOnDemand(
    channel: string,
    toSend: unknown[],
    axiosInstance: AxiosInstance = axios
  ) {
    const clusterInfo = this.receiver?.getClusterInfo();
    try {
      const [telemetryUrl, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(channel),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      await this.sendEvents(
        toSend,
        telemetryUrl,
        channel,
        clusterInfo?.cluster_uuid,
        clusterInfo?.cluster_name,
        clusterInfo?.version?.number,
        licenseInfo?.uid,
        axiosInstance
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
    }
  }

  private async fetchTelemetryUrl(channel: string): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return this.getV3UrlFromV2(telemetryUrl.toString(), channel);
  }

  // Forms URLs like:
  // https://telemetry.elastic.co/v3/send/my-channel-name or
  // https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
  public getV3UrlFromV2(v2url: string, channel: string): string {
    const url = new URL(v2url);
    if (!url.hostname.includes('staging')) {
      url.pathname = `/v3/send/${channel}`;
    } else {
      url.pathname = `/v3-dev/send/${channel}`;
    }
    return url.toString();
  }

  private async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    channel: string,
    clusterUuid: string | undefined,
    clusterName: string | undefined,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined,
    axiosInstance: AxiosInstance = axios
  ) {
    const ndjson = transformDataToNdjson(events);

    try {
      this.logger.debug(`Sending ${events.length} telemetry events to ${channel}`);
      const resp = await axiosInstance.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Cluster-Name': clusterName,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '8.0.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        },
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: resp.status.toString(),
        incrementBy: 1,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'docs_sent',
        incrementBy: events.length,
      });
      this.logger.debug(`Events sent!. Response: ${resp.status} ${JSON.stringify(resp.data)}`);
    } catch (err) {
      this.logger.debug(`Error sending events: ${err}`);
      const errorStatus = err?.response?.status;
      if (errorStatus !== undefined && errorStatus !== null) {
        this.telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
          counterType: errorStatus.toString(),
          incrementBy: 1,
        });
      }
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'num_exceptions',
        incrementBy: 1,
      });
    }
  }
}
