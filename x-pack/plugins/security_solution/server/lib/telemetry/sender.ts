/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { URL } from 'url';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { Logger } from 'src/core/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import { TelemetryEvent } from './types';
/*
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
*/
// /import { TelemetryReceiver } from './receiver';
import { allowlistEventFields, copyAllowlistedFields } from './filters';
// /import { createTelemetryTaskConfigs } from './tasks';
import { createUsageCounterLabel } from './helpers';
// /import { TelemetryEvent } from './types';
// /import { TELEMETRY_MAX_BUFFER_SIZE } from './constants';
import { TELEMETRY_USAGE_LABEL_PREFIX } from './constants';
// /import { SecurityTelemetryTask, SecurityTelemetryTaskConfig } from './task';

const USAGE_LABEL_PREFIX: string[] = TELEMETRY_USAGE_LABEL_PREFIX.concat(['sender']);

export class TelemetryEventsSender {
  // /private readonly initialCheckDelayMs = 10 * 1000;
  // /private readonly checkIntervalMs = 60 * 1000;
  private readonly logger: Logger;
  // /private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  // /private intervalId?: NodeJS.Timeout;
  // /private isSending = false;
  // /private receiver: TelemetryReceiver | undefined;
  // /private queue: TelemetryEvent[] = [];
  // /private isOptedIn?: boolean = true; // Assume true until the first check

  private telemetryUsageCounter?: UsageCounter;
  // /private telemetryTasks?: SecurityTelemetryTask[];

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(
    // /telemetryReceiver: TelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    // /taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;
    /*  
    if (taskManager) {
      this.telemetryTasks = createTelemetryTaskConfigs().map(
        (config: SecurityTelemetryTaskConfig) => {
          const task = new SecurityTelemetryTask(config, this.logger, this, telemetryReceiver);
          task.register(taskManager);
          return task;
        }
      );
    }
    */
  }

  public start(
    telemetryStart?: TelemetryPluginStart
    // /taskManager?: TaskManagerStartContract,
    // /receiver?: TelemetryReceiver
  ) {
    this.telemetryStart = telemetryStart;
    // /this.receiver = receiver;

    /*
    if (taskManager && this.telemetryTasks) {
      this.logger.debug(`Starting security telemetry tasks`);
      this.telemetryTasks.forEach((task) => task.start(taskManager));
    }
    */

    this.logger.debug(`Starting local task`);
    /*
    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
    */
  }

  public stop() {
    /*
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    */
    this.logger.debug('Stopping Telemetry Sender.');
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return events.map(function (obj: TelemetryEvent): TelemetryEvent {
      return copyAllowlistedFields(allowlistEventFields, obj);
    });
  }

  public async fetchTelemetryUrl(channel: string): Promise<string> {
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

  public async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    channel: string,
    clusterUuid: string | undefined,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined
  ) {
    const ndjson = transformDataToNdjson(events);

    try {
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.10.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        },
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['payloads', channel])),
        counterType: resp.status.toString(),
        incrementBy: 1,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['payloads', channel])),
        counterType: 'docs_sent',
        incrementBy: events.length,
      });
      this.logger.debug(`Events sent!. Response: ${resp.status} ${JSON.stringify(resp.data)}`);
    } catch (err) {
      this.logger.warn(
        `Error sending events: ${err.response.status} ${JSON.stringify(err.response.data)}`
      );
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['payloads', channel])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['payloads', channel])),
        counterType: 'num_exceptions',
        incrementBy: 1,
      });
    }
  }
}
