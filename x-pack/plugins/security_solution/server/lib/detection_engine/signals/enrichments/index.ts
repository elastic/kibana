/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import { mergeWith, isArray } from 'lodash';

import { createThreatEnrichments } from './threat_indicators';
import type { SignalSourceHit } from '../types';
import type { BuildRuleMessage } from '../rule_messages';

export const enrichEvents = async ({
  services,
  logger,
  buildRuleMessage,
  events,
  listClient,
}: {
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  events: SignalSourceHit[];
  listClient: ListClient;
}) => {
  const allEventsWithEnrichments = await Promise.all([
    // createThreatEnrichments({
    //   services,
    //   logger,
    //   buildRuleMessage,
    //   events,
    //   threatIndex: ['filebeat*'],
    //   threatIndicatorPath: 'threat.indicator',
    // }),
    createThreatEnrichments({
      services,
      logger,
      buildRuleMessage,
      events,
      threatIndex: ['threat-indicator-0','threat-indicator-1','threat-indicator-2','threat-indicator-3','threat-indicator-4','threat-indicator-5','threat-indicator-6','threat-indicator-7','threat-indicator-8','threat-indicator-9'],
      threatIndicatorPath: 'threat.indicator',
      listClient,
    })
  ]);

  const eventsMap: { [key: string]: SignalSourceHit[] } = {};
  allEventsWithEnrichments.forEach((enrichedEvents: SignalSourceHit[] | undefined) => {
    enrichedEvents?.forEach((signal: SignalSourceHit) => {
      if (!eventsMap[signal._id]) {
        eventsMap[signal._id] = [];
      }
      eventsMap[signal._id].push(signal);
    });
  });

  const enrichedMergedEvents: SignalSourceHit[] = [];
  Object.keys(eventsMap).forEach((id) => {
    const eventsById = eventsMap[id];
    // TODO: Does merge ok for us here?
    const mergedEvent: SignalSourceHit | null = eventsById.reduce(
      (acc, val) =>
        mergeWith(acc, val, (objValue, srcValue) => {
          if (isArray(objValue)) {
            return objValue.concat(srcValue);
          }
        }),
      null
    );
    if (mergedEvent) enrichedMergedEvents.push(mergedEvent);
  });

  return enrichedMergedEvents;
};
