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
  // Create map of ancenstor_id -> alert_id
  /* eslint-disable no-param-reassign */
  const signalIdMap = createdEvents.reduce((signalMap, obj) => {
    const ancestorId = String(obj['kibana.alert.original_event.id']);
    const alertId = String(obj._id);
    if (ancestorId !== null && ancestorId !== undefined) {
      signalMap = signalIdMap.set(ancestorId, alertId);
    }

    return signalMap;
  }, new Map<CreatedSignalId, AlertId>());

  const selectedEvents = selectEvents(filteredEvents);
  if (selectedEvents.length > 0) {
    const alertsWithSignalIds = enrichEndpointAlertsSignalID(selectedEvents, signalIdMap);
    try {
      eventsTelemetry.queueTelemetryEvents(alertsWithSignalIds);
    } catch (exc) {
      logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
    }
  }
}
