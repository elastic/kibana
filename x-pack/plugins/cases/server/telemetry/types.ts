/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { Owner } from '../../common/constants/types';
import type { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';

export type BucketKeyString = Omit<Bucket, 'key'> & { key: string };

export interface Bucket<T extends string | number = string | number> {
  doc_count: number;
  key: T;
}

export interface Buckets<T extends string | number = string | number> {
  buckets: Array<Bucket<T>>;
}

export interface Cardinality {
  value: number;
}

export type ValueCount = Cardinality;

export interface MaxBucketOnCaseAggregation {
  references: { cases: { max: { value: number } } };
}

export interface ReferencesAggregation {
  references: { referenceType: { referenceAgg: { value: number } } };
}

export interface CollectTelemetryDataParams {
  savedObjectsClient: TelemetrySavedObjectsClient;
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

export interface AssigneesFilters {
  buckets: {
    zero: { doc_count: number };
    atLeastOne: { doc_count: number };
  };
}

export interface FileAttachmentAggsResult {
  averageSize: {
    value: number;
  };
  topMimeTypes: Buckets<string>;
}

export type FileAttachmentAggregationResults = Record<Owner, FileAttachmentAggsResult> &
  FileAttachmentAggsResult;

export interface BucketsWithMaxOnCase {
  buckets: Array<
    {
      doc_count: number;
      key: string;
    } & MaxBucketOnCaseAggregation
  >;
}

export interface AttachmentFrameworkAggsResult {
  externalReferenceTypes: BucketsWithMaxOnCase;
  persistableReferenceTypes: BucketsWithMaxOnCase;
}

export type AttachmentAggregationResult = Record<Owner, AttachmentFrameworkAggsResult> & {
  participants: Cardinality;
} & AttachmentFrameworkAggsResult;

export type CaseAggregationResult = Record<
  Owner,
  {
    counts: Buckets;
    totalAssignees: ValueCount;
    assigneeFilters: AssigneesFilters;
  }
> & {
  assigneeFilters: AssigneesFilters;
  counts: Buckets;
  syncAlerts: Buckets;
  status: Buckets;
  users: Cardinality;
  tags: Cardinality;
  totalAssignees: ValueCount;
  totalsByOwner: Buckets;
};

export interface Assignees {
  total: number;
  totalWithZero: number;
  totalWithAtLeastOne: number;
}

interface CommonAttachmentStats {
  average: number;
  maxOnACase: number;
  total: number;
}

export interface AttachmentStats extends CommonAttachmentStats {
  type: string;
}

export interface FileAttachmentStats extends CommonAttachmentStats {
  averageSize: number;
  topMimeTypes: Array<{
    name: string;
    count: number;
  }>;
}

export interface AttachmentFramework {
  attachmentFramework: {
    externalAttachments: AttachmentStats[];
    persistableAttachments: AttachmentStats[];
    files: FileAttachmentStats;
  };
}

export interface SolutionTelemetry extends Count, AttachmentFramework {
  assignees: Assignees;
}

export interface Status {
  open: number;
  inProgress: number;
  closed: number;
}

export interface LatestDates {
  createdAt: string;
  updatedAt: string;
  closedAt: string;
}

export interface CustomFieldsTelemetry {
  totalsByType: Record<string, number>;
  totals: number;
  required: number;
}

export interface CustomFieldsSolutionTelemetry {
  customFields: CustomFieldsTelemetry;
}

export interface CasesTelemetry {
  cases: {
    all: Count &
      AttachmentFramework & {
        assignees: Assignees;
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
    sec: SolutionTelemetry;
    obs: SolutionTelemetry;
    main: SolutionTelemetry;
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
      customFields: CustomFieldsTelemetry;
    };
    sec: CustomFieldsSolutionTelemetry;
    obs: CustomFieldsSolutionTelemetry;
    main: CustomFieldsSolutionTelemetry;
  };
  casesSystemAction: {
    totalCasesCreated: number;
    totalRules: number;
  };
}

export type CountSchema = MakeSchemaFrom<Count>;
export type StatusSchema = MakeSchemaFrom<Status>;
export type LatestDatesSchema = MakeSchemaFrom<LatestDates>;
export type CasesTelemetrySchema = MakeSchemaFrom<CasesTelemetry>;
export type AssigneesSchema = MakeSchemaFrom<Assignees>;
export type AttachmentFrameworkSchema = MakeSchemaFrom<AttachmentFramework['attachmentFramework']>;
export type AttachmentItemsSchema = MakeSchemaFrom<AttachmentStats>;
export type SolutionTelemetrySchema = MakeSchemaFrom<SolutionTelemetry>;
export type CustomFieldsSolutionTelemetrySchema = MakeSchemaFrom<CustomFieldsSolutionTelemetry>;
