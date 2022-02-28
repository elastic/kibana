/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';

export interface CollectTelemetryDataParams {
  savedObjectsClient: ISavedObjectsRepository;
}

export interface Long {
  type: 'long';
}

export interface Count {
  all: number;
  '1m': number;
  '1w': number;
  '1d': number;
}

export interface CasesTelemetry {
  cases: {
    all: Count;
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
    maxAttachedToACase: Count;
    itsm: { totalAttached: number };
    sir: { totalAttached: number };
    jira: { totalAttached: number };
    ibm: { totalAttached: number };
    swimlane: { totalAttached: number };
  };
  externalServices: {
    totalPushes: number;
    maxPushesOnACase: number;
  };
  configuration: {
    closeCaseAfterPush: number;
  };
}

export type CountSchema = MakeSchemaFrom<Count>;
export type CasesTelemetrySchema = MakeSchemaFrom<CasesTelemetry>;
