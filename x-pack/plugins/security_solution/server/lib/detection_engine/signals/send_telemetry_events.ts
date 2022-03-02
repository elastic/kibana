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

interface SearchResultWithEventId {
  _source: {
    event: {
      id: string;
    };
  };
}

interface SearchResultSource {
  _source: SignalSource;
}

type CreatedSignalId = string;
type AlertId = string;

type SearchResultWithSource = SearchResultSource & SearchResultWithEventId;

export function selectEvents(
  filteredEvents: SignalSearchResponse,
  signalIdMap: Map<string, string>
): TelemetryEvent[] {
  // @ts-expect-error @elastic/elasticsearch _source is optional
  const sources: TelemetryEvent[] = filteredEvents.hits.hits.map(function (
    obj: SearchResultWithSource
  ): TelemetryEvent {
    obj._source.signal_id = signalIdMap.get(obj._source.event.id);
    return obj._source;
  });

  // Filter out non-endpoint alerts
  return sources.filter((obj: TelemetryEvent) => obj.data_stream?.dataset === 'endpoint.alerts');
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
  const signalIdMap = createdEvents.reduce((signalMap, obj) => {
    const ancestorId = String(obj['kibana.alert.original_event.id']);
    const alertId = String(obj._id);
    if (ancestorId !== null && ancestorId !== undefined) {
      const newsignalMap = signalIdMap.set(ancestorId, alertId);
    }

    return newsignalMap;
  }, new Map<CreatedSignalId, AlertId>());

  const sources = selectEvents(filteredEvents, signalIdMap);

  try {
    eventsTelemetry.queueTelemetryEvents(sources);
  } catch (exc) {
    logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
  }
}
