/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { TelemetryEvent } from '../../telemetry/types';
import { BuildRuleMessage } from './rule_messages';
import { SignalSearchResponse, SignalSource, SimpleHit } from './types';
import { Logger } from '../../../../../../../src/core/server';

export interface SearchResultWithSource {
  _source: SignalSource;
}

function selectEventsFromHits(eventHits: Array<estypes.SearchHit<SignalSource>>): TelemetryEvent[] {
  // @ts-expect-error @elastic/elasticsearch _source is optional
  const sources: TelemetryEvent[] = eventHits.map(function (
    obj: SearchResultWithSource
  ): TelemetryEvent {
    return obj._source;
  });

  // Filter out non-endpoint alerts
  return sources.filter((obj: TelemetryEvent) => obj.data_stream?.dataset === 'endpoint.alerts');
}

export function selectEvents(filteredEvents: SignalSearchResponse): TelemetryEvent[] {
  return selectEventsFromHits(filteredEvents.hits.hits);
}

export function sendAlertTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  filteredEvents: SignalSearchResponse,
  buildRuleMessage: BuildRuleMessage
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  const sources = selectEvents(filteredEvents);

  try {
    eventsTelemetry.queueTelemetryEvents(sources);
  } catch (exc) {
    logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
  }
}

export function sendAlertTelemetryEventsFromHits(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  filteredEventHits: SimpleHit[],
  buildRuleMessage: BuildRuleMessage
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  const sources = selectEventsFromHits(filteredEventHits);

  try {
    eventsTelemetry.queueTelemetryEvents(sources);
  } catch (exc) {
    logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
  }
}
