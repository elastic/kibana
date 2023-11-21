/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SafeEndpointEvent } from '../../../../common/endpoint/types';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type {
  EnhancedAlertEvent,
  ESClusterInfo,
  ESLicense,
  TimelineTelemetryTemplate,
  TimelineTelemetryEvent,
} from '../types';
import { TELEMETRY_CHANNEL_TIMELINE, TASK_METRICS_CHANNEL } from '../constants';
import { resolverEntity } from '../../../endpoint/routes/resolver/entity/utils/build_resolver_entity';
import { tlog, createTaskMetric } from '../helpers';

interface ExtraInfo {
  clusterInfo: ESClusterInfo;
  licenseInfo: ESLicense | undefined;
}
interface TimeFrame {
  startOfDay: string;
  endOfDay: string;
}
interface TimelineResult {
  nodes: number;
  events: number;
  timeline: TimelineTelemetryTemplate | undefined;
}

export function createTelemetryDiagnosticTimelineTaskConfig() {
  const taskName = 'Security Solution Diagnostic Timeline telemetry';

  return {
    type: 'security:telemetry-diagnostic-timelines',
    title: taskName,
    interval: '1m',
    timeout: '15m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      tlog(
        logger,
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      const fetcher = new TelemetryTimelineFetcher(receiver);

      try {
        let counter = 0;

        const rangeFrom = taskExecutionPeriod.last ?? 'now-3h';
        const rangeTo = taskExecutionPeriod.current;

        const alerts = await receiver.fetchDiagnosticTimelineEndpointAlerts(rangeFrom, rangeTo);

        tlog(logger, `found ${alerts.length} alerts to process`);

        for (const alert of alerts) {
          const result = await fetcher.fetchTimeline(alert);

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_node_count',
            incrementBy: result.nodes,
          });

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_event_count',
            incrementBy: result.events,
          });

          if (result.timeline) {
            sender.sendOnDemand(TELEMETRY_CHANNEL_TIMELINE, [result.timeline]);
            counter += 1;
          } else {
            tlog(logger, 'no events in timeline');
          }
        }

        tlog(logger, `sent ${counter} timelines. Concluding timeline task.`);

        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, fetcher.startTime),
        ]);

        return counter;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, fetcher.startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}

class TelemetryTimelineFetcher {
  startTime: number;
  private receiver: ITelemetryReceiver;
  private extraInfo: Promise<ExtraInfo>;
  private timeFrame: TimeFrame;

  constructor(receiver: ITelemetryReceiver) {
    this.receiver = receiver;
    this.startTime = Date.now();
    this.extraInfo = this.lookupExtraInfo();
    this.timeFrame = this.calculateTimeFrame();
  }

  async fetchTimeline(event: estypes.SearchHit<EnhancedAlertEvent>): Promise<TimelineResult> {
    const eventId = event._source ? event._source['event.id'] : 'unknown';
    const alertUUID = event._source ? event._source['kibana.alert.uuid'] : 'unknown';

    const entities = resolverEntity([event]);

    // Build Tree
    const tree = await this.receiver.buildProcessTree(
      entities[0].id,
      entities[0].schema,
      this.timeFrame.startOfDay,
      this.timeFrame.endOfDay
    );

    const nodeIds = Array.isArray(tree) ? tree.map((node) => node?.id.toString()) : [];

    const eventsStore = await this.fetchEventLineage(nodeIds);

    const telemetryTimeline: TimelineTelemetryEvent[] = Array.isArray(tree)
      ? tree.map((node) => {
          return {
            ...node,
            event: eventsStore.get(node.id.toString()),
          };
        })
      : [];

    let record;
    if (telemetryTimeline.length >= 1) {
      const { clusterInfo, licenseInfo } = await this.extraInfo;
      record = {
        '@timestamp': moment().toISOString(),
        version: clusterInfo.version?.number,
        cluster_name: clusterInfo.cluster_name,
        cluster_uuid: clusterInfo.cluster_uuid,
        license_uuid: licenseInfo?.uid,
        alert_id: alertUUID,
        event_id: eventId,
        timeline: telemetryTimeline,
      };
    }

    const result: TimelineResult = {
      nodes: nodeIds.length,
      events: eventsStore.size,
      timeline: record,
    };

    return result;
  }

  private async fetchEventLineage(nodeIds: string[]): Promise<Map<string, SafeEndpointEvent>> {
    const timelineEvents = await this.receiver.fetchTimelineEvents(nodeIds);
    const eventsStore = new Map<string, SafeEndpointEvent>();
    for (const event of timelineEvents.hits.hits) {
      const doc = event._source;

      if (doc !== null && doc !== undefined) {
        const entityId = doc?.process?.entity_id?.toString();
        if (entityId !== null && entityId !== undefined) eventsStore.set(entityId, doc);
      }
    }
    return eventsStore;
  }

  private async lookupExtraInfo(): Promise<ExtraInfo> {
    const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
      this.receiver.fetchClusterInfo(),
      this.receiver.fetchLicenseInfo(),
    ]);

    const clusterInfo: ESClusterInfo =
      clusterInfoPromise.status === 'fulfilled' ? clusterInfoPromise.value : ({} as ESClusterInfo);

    const licenseInfo: ESLicense | undefined =
      licenseInfoPromise.status === 'fulfilled' ? licenseInfoPromise.value : ({} as ESLicense);

    return { clusterInfo, licenseInfo };
  }

  private calculateTimeFrame(): TimeFrame {
    const now = moment();
    const startOfDay = now.startOf('day').toISOString();
    const endOfDay = now.endOf('day').toISOString();
    return { startOfDay, endOfDay };
  }
}
