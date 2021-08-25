/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import axios from 'axios';
import { SavedObjectsClientContract } from 'kibana/server';
import { URL } from 'url';
import { CoreStart, ElasticsearchClient, Logger } from 'src/core/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import { transformDataToNdjson } from '../../utils/read_stream/create_stream_from_ndjson';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import {
  TelemetryQuerier
} from './queries'
import { DiagnosticTask, EndpointTask, ExceptionListsTask } from './tasks';
import { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { AgentService, AgentPolicyServiceInterface } from '../../../../fleet/server';
import { getTrustedAppsList } from '../../endpoint/routes/trusted_apps/service';
import { ExceptionListClient } from '../../../../lists/server';
import { GetEndpointListResponse } from './types';
import { createUsageCounterLabel, exceptionListItemToEndpointEntry } from './helpers';

const usageLabelPrefix: string[] = ['security_telemetry', 'sender'];

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;
  private readonly logger: Logger;
  private maxQueueSize = 100;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private querier: TelemetryQuerier | undefined;
  private queue: TelemetryEvent[] = [];
  private isOptedIn?: boolean = true; // Assume true until the first check
  private agentService?: AgentService;
  private agentPolicyService?: AgentPolicyServiceInterface;
  private savedObjectsClient?: SavedObjectsClientContract;
  private exceptionListClient?: ExceptionListClient;
  private telemetryUsageCounter?: UsageCounter;
  private diagnosticTask?: DiagnosticTask;
  private endpointTask?: EndpointTask;
  private exceptionListsTask?: ExceptionListsTask;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;

    if (taskManager) {
      this.diagnosticTask = new DiagnosticTask(this.logger, taskManager, this);
      this.endpointTask = new EndpointTask(this.logger, taskManager, this);
      this.exceptionListsTask = new ExceptionListsTask(this.logger, taskManager, this);
    }
  }

  public start(
    core?: CoreStart,
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient
  ) {
    this.telemetryStart = telemetryStart;
    const esClient = core?.elasticsearch.client.asInternalUser;
    const agentService = endpointContextService?.getAgentService();
    this.querier = new TelemetryQuerier(esClient, agentService)
    this.agentPolicyService = endpointContextService?.getAgentPolicyService();
    this.savedObjectsClient = (core?.savedObjects.createInternalRepository() as unknown) as SavedObjectsClientContract;
    this.exceptionListClient = exceptionListClient;

    if (taskManager && this.diagnosticTask && this.endpointTask && this.exceptionListsTask) {
      this.logger.debug(`starting security telemetry tasks`);
      this.diagnosticTask.start(taskManager);
      this.endpointTask.start(taskManager);
      this.exceptionListsTask?.start(taskManager);
    }

    this.logger.debug(`Starting local task`);
    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }


  public async fetchPolicyConfigs(id: string) {
    if (this.savedObjectsClient === undefined || this.savedObjectsClient === null) {
      throw Error('could not fetch endpoint policy configs. saved object client is not available');
    }

    return this.agentPolicyService?.get(this.savedObjectsClient, id);
  }

  public async fetchTrustedApplications() {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('could not fetch trusted applications. exception list client not available.');
    }

    return getTrustedAppsList(this.exceptionListClient, { page: 1, per_page: 10_000 });
  }

  public async fetchEndpointList(listId: string): Promise<GetEndpointListResponse> {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('could not fetch trusted applications. exception list client not available.');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createTrustedAppsList();

    const results = await this.exceptionListClient.findExceptionListItem({
      listId,
      page: 1,
      perPage: this.max_records,
      filter: undefined,
      namespaceType: 'agnostic',
      sortField: 'name',
      sortOrder: 'asc',
    });

    return {
      data: results?.data.map(exceptionListItemToEndpointEntry) ?? [],
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.max_records,
    };
  }

  public queueTelemetryEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

    this.logger.debug(`Queue events`);

    if (qlength >= this.maxQueueSize) {
      // we're full already
      return;
    }

    if (events.length > this.maxQueueSize - qlength) {
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['queue_stats'])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['queue_stats'])),
        counterType: 'num_capacity_exceeded',
        incrementBy: 1,
      });
      this.queue.push(...this.processEvents(events.slice(0, this.maxQueueSize - qlength)));
    } else {
      this.queue.push(...this.processEvents(events));
    }
  }



  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  private async sendIfDue() {
    if (this.isSending) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    try {
      this.isSending = true;

      this.isOptedIn = await this.isTelemetryOptedIn();
      if (!this.isOptedIn) {
        this.logger.debug(`Telemetry is not opted-in.`);
        this.queue = [];
        this.isSending = false;
        return;
      }

      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl('alerts-endpoint'),
        this.fetchClusterInfo(),
        this.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      const toSend: TelemetryEvent[] = cloneDeep(this.queue).map((event) => ({
        ...event,
        ...(licenseInfo ? { license: this.copyLicenseFields(licenseInfo) } : {}),
        cluster_uuid: clusterInfo.cluster_uuid,
        cluster_name: clusterInfo.cluster_name,
      }));
      this.queue = [];

      await this.sendEvents(
        toSend,
        telemetryUrl,
        'alerts-endpoint',
        clusterInfo.cluster_uuid,
        clusterInfo.version?.number,
        licenseInfo?.uid
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      this.queue = [];
    }
    this.isSending = false;
  }

  /**
   * This function sends events to the elastic telemetry channel. Caution is required
   * because it does no allowlist filtering. The caller is responsible for making sure
   * that there is no sensitive material or PII in the records that are sent upstream.
   *
   * @param channel the elastic telemetry channel
   * @param toSend telemetry events
   */
  public async sendOnDemand(channel: string, toSend: unknown[]) {
    try {
      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(channel),
        this.fetchClusterInfo(),
        this.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      await this.sendEvents(
        toSend,
        telemetryUrl,
        channel,
        clusterInfo.cluster_uuid,
        clusterInfo.version?.number,
        licenseInfo?.uid
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
    return getV3UrlFromV2(telemetryUrl.toString(), channel);
  }



  private async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    channel: string,
    clusterUuid: string,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined
  ) {
    const ndjson = transformDataToNdjson(events);
    // this.logger.debug(`NDJSON: ${ndjson}`);

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
      this.logger.warn(
        `Error sending events: ${err.response.status} ${JSON.stringify(err.response.data)}`
      );
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

// Forms URLs like:
// https://telemetry.elastic.co/v3/send/my-channel-name or
// https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
export function getV3UrlFromV2(v2url: string, channel: string): string {
  const url = new URL(v2url);
  if (!url.hostname.includes('staging')) {
    url.pathname = `/v3/send/${channel}`;
  } else {
    url.pathname = `/v3-dev/send/${channel}`;
  }
  return url.toString();
}
