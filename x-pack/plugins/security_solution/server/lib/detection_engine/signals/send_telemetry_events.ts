/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TelemetryEventsSender, TelemetryEvent } from '../../telemetry/sender';
import { RuleTypeParams } from '../types';
import { BuildRuleMessage } from './rule_messages';
import { SignalSearchResponse, SignalSource } from './types';
import { Logger } from '../../../../../../../src/core/server';

export interface SearchResultWithSource {
  _source: SignalSource;
}

export function selectEvents(filteredEvents: SignalSearchResponse): TelemetryEvent[] {
  const sources = filteredEvents.hits.hits.map(function (
    obj: SearchResultWithSource
  ): TelemetryEvent {
    return obj._source;
  });

  // Filter out non-endpoint alerts
  return sources.filter((obj: TelemetryEvent) => obj.data_stream?.dataset === 'endpoint.alerts');
}

export function sendAlertTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  filteredEvents: SignalSearchResponse,
  ruleParams: RuleTypeParams,
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
