/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITelemetryEventsSender } from '../../telemetry/sender';
import { TelemetryEvent } from '../../telemetry/types';
import { BuildRuleMessage } from './rule_messages';
import { SignalSearchResponse, SignalSource } from './types';
import { Logger } from '../../../../../../../src/core/server';

interface SearchResultSource {
  _source: SignalSource;
}

type CreatedSignalId = string;
type AlertId = string;

export function selectEvents(filteredEvents: SignalSearchResponse): TelemetryEvent[] {
  // @ts-expect-error @elastic/elasticsearch _source is optional
  const sources: TelemetryEvent[] = filteredEvents.hits.hits.map(function (
    obj: SearchResultSource
  ): TelemetryEvent {
    return obj._source;
  });

  // Filter out non-endpoint alerts
  return sources.filter((obj: TelemetryEvent) => obj.data_stream?.dataset === 'endpoint.alerts');
}

export function enrichEndpointAlertsSignalID(
  events: TelemetryEvent[],
  signalIdMap: Map<string, string>
): TelemetryEvent[] {
  return events.map(function (obj: TelemetryEvent): TelemetryEvent {
    obj.signal_id = undefined;
    if (obj?.event?.id !== undefined) {
      obj.signal_id = signalIdMap.get(obj.event.id);
    }
    return obj;
  });
}

export function sendAlertTelemetryEvents(
  logger: Logger,
  eventsTelemetry: ITelemetryEventsSender | undefined,
  filteredEvents: SignalSearchResponse,
  createdEvents: SignalSource[],
  buildRuleMessage: BuildRuleMessage
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  let selectedEvents = selectEvents(filteredEvents);
  if (selectedEvents.length > 0) {
    // Create map of ancenstor_id -> alert_id
    let signalIdMap = new Map<CreatedSignalId, AlertId>();
    /* eslint-disable no-param-reassign */
    signalIdMap = createdEvents.reduce((signalMap, obj) => {
      const ancestorId = obj['kibana.alert.original_event.id']?.toString();
      const alertId = obj._id?.toString();
      if (ancestorId !== null && ancestorId !== undefined && alertId !== undefined) {
        signalMap = signalIdMap.set(ancestorId, alertId);
      }

      return signalMap;
    }, new Map<CreatedSignalId, AlertId>());

    selectedEvents = enrichEndpointAlertsSignalID(selectedEvents, signalIdMap);
  }
  try {
    eventsTelemetry.queueTelemetryEvents(selectedEvents);
  } catch (exc) {
    logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
  }
}
