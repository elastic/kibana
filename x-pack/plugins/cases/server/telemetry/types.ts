/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';

export interface Buckets {
  buckets: Array<{
    doc_count: number;
    key: number | string;
  }>;
}

export interface Cardinality {
  value: number;
}

export interface MaxBucketOnCaseAggregation {
  references: { cases: { max: { value: number } } };
}

export interface ReferencesAggregation {
  references: { referenceType: { referenceAgg: { value: number } } };
}

export interface CollectTelemetryDataParams {
  savedObjectsClient: ISavedObjectsRepository;
  logger: Logger;
}

export interface TypeLong {
  type: 'long';
}

export interface TypeString {
  type: 'keyword';
}

export interface Count {
  total: number;
  monthly: number;
  weekly: number;
  daily: number;
}

export interface Status {
  open: number;
  inProgress: number;
  closed: number;
}

export interface LatestDates {
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
}

export interface CasesTelemetry {
  cases: {
    all: Count & {
      status: Status;
      syncAlertsOn: number;
      syncAlertsOff: number;
      totalUsers: number;
      totalParticipants: number;
      totalTags: number;
      totalWithAlerts: number;
      totalWithConnectors: number;
      latestDates: LatestDates;
    };
    sec: Count;
    obs: Count;
    main: Count;
  };
  userActions: { all: Count & { maxOnACase: number } };
  comments: { all: Count & { maxOnACase: number } };
  alerts: { all: Count & { maxOnACase: number } };
  connectors: {
    all: {
      all: { totalAttached: number };
      itsm: { totalAttached: number };
      sir: { totalAttached: number };
      jira: { totalAttached: number };
      resilient: { totalAttached: number };
      swimlane: { totalAttached: number };
      maxAttachedToACase: number;
    };
  };
  pushes: {
    all: { total: number; maxOnACase: number };
  };
  configuration: {
    all: {
      closure: {
        manually: number;
        automatic: number;
      };
    };
  };
}

export type CountSchema = MakeSchemaFrom<Count>;
export type StatusSchema = MakeSchemaFrom<Status>;
export type LatestDatesSchema = MakeSchemaFrom<LatestDates>;
export type CasesTelemetrySchema = MakeSchemaFrom<CasesTelemetry>;
