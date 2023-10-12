/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Client } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import {
  FAKE_HOSTS,
  FAKE_LOGS,
  FAKE_EC2,
  FAKE_K8S,
  FAKE_APM_LATENCY,
  FAKE_STACK,
} from '../common/constants';
import { Doc } from '../common/types';

export const DatasetRT = rt.keyof({
  [FAKE_HOSTS]: null,
  [FAKE_LOGS]: null,
  [FAKE_EC2]: null,
  [FAKE_K8S]: null,
  [FAKE_APM_LATENCY]: null,
  [FAKE_STACK]: null,
});

export type Dataset = rt.TypeOf<typeof DatasetRT>;

const TransitionMethodRT = rt.keyof({
  linear: null,
  exp: null,
  sine: null,
});

export type TransitionMethod = rt.TypeOf<typeof TransitionMethodRT>;

export const EventsPerCycleTransitionDefRT = rt.intersection([
  rt.type({
    start: rt.number,
    end: rt.number,
    method: TransitionMethodRT,
  }),
  rt.partial({
    options: rt.partial({
      period: rt.number,
    }),
  }),
]);

export const EventsPerCycleRT = rt.union([rt.number, EventsPerCycleTransitionDefRT]);

export type EventsPerCycle = rt.TypeOf<typeof EventsPerCycleRT>;

export const MetricEventDefRT = rt.intersection([
  rt.type({
    name: rt.string,
    method: TransitionMethodRT,
    start: rt.number,
    end: rt.number,
  }),
  rt.partial({
    period: rt.number,
    randomness: rt.number,
  }),
]);

export type MetricEventDef = rt.TypeOf<typeof MetricEventDefRT>;

const PartialScheduleBaseRT = rt.partial({
  eventsPerCycle: EventsPerCycleRT,
  interval: rt.number,
  delayInMinutes: rt.number,
  delayEveryMinutes: rt.number,
  randomness: rt.number,
  metrics: rt.array(MetricEventDefRT),
});

export const ScheduleRT = rt.intersection([
  rt.type({
    template: rt.string,
    start: rt.string,
    end: rt.union([rt.string, rt.boolean]),
  }),
  PartialScheduleBaseRT,
]);

export type Schedule = rt.TypeOf<typeof ScheduleRT>;

export const ParsedScheduleRT = rt.intersection([
  rt.type({
    template: rt.string,
    start: rt.number,
    end: rt.union([rt.number, rt.boolean]),
  }),
  PartialScheduleBaseRT,
]);

export type ParsedSchedule = rt.TypeOf<typeof ParsedScheduleRT>;

export const ConfigRT = rt.type({
  indexing: rt.type({
    dataset: DatasetRT,
    interval: rt.number,
    eventsPerCycle: rt.number,
    payloadSize: rt.number,
    concurrency: rt.number,
    reduceWeekendTrafficBy: rt.number,
  }),
  schedule: rt.array(ScheduleRT),
  installAssets: rt.boolean,
});

export type Config = rt.TypeOf<typeof ConfigRT>;

export const PartialConfigRT = rt.partial({
  indexing: rt.partial(ConfigRT.props.indexing.props),
  schedule: rt.array(ScheduleRT),
});
export type PartialConfig = rt.TypeOf<typeof PartialConfigRT>;

export type GeneratorFunction = (
  config: Config,
  schedule: ParsedSchedule,
  index: number,
  timestamp: Moment
) => Doc[];
export type EventFunction = (schedule: Schedule | ParsedSchedule, timestamp: Moment) => Doc[];
export type EventTemplate = Array<[EventFunction, number]>;
export type ElasticSearchService = (client: Client) => Promise<any>;

export const IndexTemplateDefRT = rt.type({
  namespace: rt.string,
  template: rt.UnknownRecord,
  components: rt.array(rt.type({ name: rt.string, template: rt.UnknownRecord })),
});

export type IndexTemplateDef = rt.TypeOf<typeof IndexTemplateDefRT>;

export interface Point {
  x: number;
  y: number;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface HighCardinalityIndexerPluginStart {}
export interface HighCardinalityIndexerPluginSetup {}
export interface HighCardinalityIndexerPluginSetupDependencies {}
export interface HighCardinalityIndexerPluginStartDependencies {}
