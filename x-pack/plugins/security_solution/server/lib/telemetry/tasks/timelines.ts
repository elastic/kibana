/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Logger } from '@kbn/core/server';
import { SafeEndpointEvent } from '../../../../common/endpoint/types';
import { ITelemetryEventsSender } from '../sender';
import { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type {
  ESClusterInfo,
  ESLicense,
  TimelineTelemetryTemplate,
  TimelineTelemetryEvent,
} from '../types';
import { TELEMETRY_CHANNEL_TIMELINE } from '../constants';
import { resolverEntity } from '../../../endpoint/routes/resolver/entity/utils/build_resolver_entity';

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
      let counter = 0;

      logger.debug(`Running task: ${taskId}`);

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

      // No EP Alerts -> Nothing to do

      if (
        endpointAlerts.hits.hits?.length === 0 ||
        endpointAlerts.hits.hits?.length === undefined
      ) {
        logger.debug('no endpoint alerts received. exiting telemetry task.');
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
        for (const node of tree) {
          const nodeId = node?.id.toString();
          nodeIds.push(nodeId);
        }

        sender.getTelemetryUsageCluster()?.incrementCounter({
          counterName: 'telemetry_timeline',
          counterType: 'timeline_node_count',
          incrementBy: nodeIds.length,
        });

        // Fetch event lineage

        const timelineEvents = await receiver.fetchTimelineEvents(nodeIds);

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
        for (const node of tree) {
          const id = node.id.toString();
          const event = eventsStore.get(id);

          const timelineTelemetryEvent: TimelineTelemetryEvent = {
            ...node,
            event,
          };

          telemetryTimeline.push(timelineTelemetryEvent);
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
          logger.debug('no events in timeline');
        }
      }

      logger.debug(`sent ${counter} timelines. concluding timeline task.`);
      return counter;
    },
  };
}
