/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CasesTelemetrySchema,
  TypeLong,
  CountSchema,
  StatusSchema,
  LatestDatesSchema,
  TypeString,
} from './types';

const long: TypeLong = { type: 'long' };
const string: TypeString = { type: 'keyword' };

const countSchema: CountSchema = {
  total: long,
  monthly: long,
  weekly: long,
  daily: long,
};

const statusSchema: StatusSchema = {
  open: long,
  inProgress: long,
  closed: long,
};

const latestDatesSchema: LatestDatesSchema = {
  createdAt: string,
  updatedAt: string,
  closedAt: string,
};

export const casesSchema: CasesTelemetrySchema = {
  cases: {
    all: {
      ...countSchema,
      status: statusSchema,
      syncAlertsOn: long,
      syncAlertsOff: long,
      totalUsers: long,
      totalParticipants: long,
      totalTags: long,
      totalWithAlerts: long,
      totalWithConnectors: long,
      latestDates: latestDatesSchema,
    },
    sec: countSchema,
    obs: countSchema,
    main: countSchema,
  },
  userActions: { all: { ...countSchema, maxOnACase: long } },
  comments: { all: { ...countSchema, maxOnACase: long } },
  alerts: { all: { ...countSchema, maxOnACase: long } },
  connectors: {
    all: {
      all: { totalAttached: long },
      itsm: { totalAttached: long },
      sir: { totalAttached: long },
      jira: { totalAttached: long },
      resilient: { totalAttached: long },
      swimlane: { totalAttached: long },
      maxAttachedToACase: long,
    },
  },
  pushes: {
    all: { total: long, maxOnACase: long },
  },
  configuration: {
    all: {
      closure: {
        manually: long,
        automatic: long,
      },
    },
  },
};
