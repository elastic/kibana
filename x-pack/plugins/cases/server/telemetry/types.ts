/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';

export interface Buckets {
  buckets: Array<{
    doc_count: number;
    key: number | string;
  }>;
}

export interface CollectTelemetryDataParams {
  savedObjectsClient: ISavedObjectsRepository;
}

export interface Long {
  type: 'long';
}

export interface Count {
  total: number;
  '1m': number;
  '1w': number;
  '1d': number;
}

export interface Status {
  open: number;
  inProgress: number;
  closed: number;
}

export interface CasesTelemetry {
  cases: {
    all: Count & { status: Status };
    sec: Count;
    obs: Count;
    main: Count;
    syncAlertsOn: number;
    syncAlertsOff: number;
  };
  userActions: { all: Count; maxOnACase: number };
  comments: { all: Count; maxOnACase: number };
  alerts: { all: Count; maxOnACase: number };
  connectors: {
    all: { totalAttached: number };
    itsm: { totalAttached: number };
    sir: { totalAttached: number };
    jira: { totalAttached: number };
    resilient: { totalAttached: number };
    swimlane: { totalAttached: number };
    maxAttachedToACase: number;
  };
  pushes: {
    all: { total: number };
    maxOnACase: number;
  };
  configuration: {
    closure: {
      manually: number;
      automatic: number;
    };
  };
}

export type CountSchema = MakeSchemaFrom<Count>;
export type StatusSchema = MakeSchemaFrom<Status>;
export type CasesTelemetrySchema = MakeSchemaFrom<CasesTelemetry>;
