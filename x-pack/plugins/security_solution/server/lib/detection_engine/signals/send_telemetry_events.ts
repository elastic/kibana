/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TelemetryEventsSender } from './lib/telemetry/sender';
import { RuleTypeParams } from '../types';
import { BuildRuleMessage } from './rule_messages';

export function selectEvents(filteredEvents: object[]): object[] {
  const sources = filteredEvents.hits.hits.map(function (obj: object): object {
    if (!('_source' in obj)) {
      return undefined;
    }
    // TODO: filter out non-endpoint alerts

    return obj._source;
  });

  return sources.filter(function (obj) {
    return obj !== undefined;
  });
}

export function sendAlertTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender,
  filteredEvents: object[],
  ruleParams: RuleTypeParams,
  buildRuleMessage: BuildRuleMessage
) {
  const sources = selectEvents(filteredEvents);

  try {
    eventsTelemetry.queueTelemetryEvents(sources);
  } catch (exc) {
    logger.error(buildRuleMessage(`[-] queing telemetry events failed ${exc}`));
  }
}
