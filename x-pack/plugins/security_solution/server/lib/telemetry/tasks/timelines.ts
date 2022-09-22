/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import type { SafeEndpointEvent } from '../../../../common/endpoint/types';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type {
  ESClusterInfo,
  ESLicense,
  TimelineTelemetryTemplate,
  TimelineTelemetryEvent,
} from '../types';
import { TELEMETRY_CHANNEL_TIMELINE, TASK_METRICS_CHANNEL } from '../constants';
import { resolverEntity } from '../../../endpoint/routes/resolver/entity/utils/build_resolver_entity';
import { tlog, createTaskMetric } from '../helpers';

export function createTelemetryTimelineTaskConfig() {
  return {
    type: 'security:telemetry-timelines',
    title: 'Security Solution Timeline telemetry',
    interval: '3h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Timeline telemetry';
      try {
        let counter = 0;

        tlog(logger, `Running task: ${taskId}`);

        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo =
          clusterInfoPromise.status === 'fulfilled'
            ? clusterInfoPromise.value
            : ({} as ESClusterInfo);

        const licenseInfo =
          licenseInfoPromise.status === 'fulfilled'
            ? licenseInfoPromise.value
            : ({} as ESLicense | undefined);

        const now = moment();
        const startOfDay = now.startOf('day').toISOString();
        const endOfDay = now.endOf('day').toISOString();

        const baseDocument = {
          version: clusterInfo.version?.number,
          cluster_name: clusterInfo.cluster_name,
          cluster_uuid: clusterInfo.cluster_uuid,
          license_uuid: licenseInfo?.uid,
        };

        // Fetch EP Alerts

        const endpointAlerts = await receiver.fetchTimelineEndpointAlerts(3);

        const aggregations = endpointAlerts?.aggregations as unknown as {
          endpoint_alert_count: { value: number };
        };
        tlog(logger, `Endpoint alert count: ${aggregations?.endpoint_alert_count}`);
        sender.getTelemetryUsageCluster()?.incrementCounter({
          counterName: 'telemetry_endpoint_alert',
          counterType: 'endpoint_alert_count',
          incrementBy: aggregations?.endpoint_alert_count.value,
        });

        // No EP Alerts -> Nothing to do
        if (
          endpointAlerts.hits.hits?.length === 0 ||
          endpointAlerts.hits.hits?.length === undefined
        ) {
          tlog(logger, 'no endpoint alerts received. exiting telemetry task.');
          await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
            createTaskMetric(taskName, true, startTime),
          ]);
          return counter;
        }

        // Build process tree for each EP Alert recieved

        for (const alert of endpointAlerts.hits.hits) {
          const eventId = alert._source ? alert._source['event.id'] : 'unknown';
          const alertUUID = alert._source ? alert._source['kibana.alert.uuid'] : 'unknown';

          const entities = resolverEntity([alert]);

          // Build Tree

          const tree = await receiver.buildProcessTree(
            entities[0].id,
            entities[0].schema,
            startOfDay,
            endOfDay
          );

          const nodeIds = [] as string[];
          if (Array.isArray(tree)) {
            for (const node of tree) {
              const nodeId = node?.id.toString();
              nodeIds.push(nodeId);
            }
          }

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_node_count',
            incrementBy: nodeIds.length,
          });

          // Fetch event lineage

          const timelineEvents = await receiver.fetchTimelineEvents(nodeIds);
          tlog(logger, `Timeline Events: ${JSON.stringify(timelineEvents)}`);
          const eventsStore = new Map<string, SafeEndpointEvent>();
          for (const event of timelineEvents.hits.hits) {
            const doc = event._source;

            if (doc !== null && doc !== undefined) {
              const entityId = doc?.process?.entity_id?.toString();
              if (entityId !== null && entityId !== undefined) eventsStore.set(entityId, doc);
            }
          }

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_event_count',
            incrementBy: eventsStore.size,
          });

          // Create telemetry record

          const telemetryTimeline: TimelineTelemetryEvent[] = [];
          if (Array.isArray(tree)) {
            for (const node of tree) {
              const id = node.id.toString();
              const event = eventsStore.get(id);

              const timelineTelemetryEvent: TimelineTelemetryEvent = {
                ...node,
                event,
              };

              telemetryTimeline.push(timelineTelemetryEvent);
            }
          }

          if (telemetryTimeline.length >= 1) {
            const record: TimelineTelemetryTemplate = {
              '@timestamp': moment().toISOString(),
              ...baseDocument,
              alert_id: alertUUID,
              event_id: eventId,
              timeline: telemetryTimeline,
            };

            sender.sendOnDemand(TELEMETRY_CHANNEL_TIMELINE, [record]);
            counter += 1;
          } else {
            tlog(logger, 'no events in timeline');
          }
        }
        tlog(logger, `sent ${counter} timelines. concluding timeline task.`);
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);
        return counter;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
