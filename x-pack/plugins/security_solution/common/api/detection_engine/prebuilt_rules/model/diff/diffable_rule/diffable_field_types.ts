/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { TimeDuration } from '@kbn/securitysolution-io-ts-types';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports
import {
  BuildingBlockType,
  DataViewId,
  IndexPatternArray,
  KqlQueryLanguage,
  RuleFilterArray,
  RuleNameOverride as RuleNameOverrideFieldName,
  RuleQuery,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampOverride as TimestampOverrideFieldName,
  TimestampOverrideFallbackDisabled,
} from '../../../../model/rule_schema_legacy';
import { saved_id } from '../../../../model/schemas';

// -------------------------------------------------------------------------------------------------
// Rule data source

export enum DataSourceType {
  'index_patterns' = 'index_patterns',
  'data_view' = 'data_view',
}

export type DataSourceIndexPatterns = t.TypeOf<typeof DataSourceIndexPatterns>;
export const DataSourceIndexPatterns = t.exact(
  t.type({
    type: t.literal(DataSourceType.index_patterns),
    index_patterns: IndexPatternArray,
  })
);

export type DataSourceDataView = t.TypeOf<typeof DataSourceDataView>;
export const DataSourceDataView = t.exact(
  t.type({
    type: t.literal(DataSourceType.data_view),
    data_view_id: DataViewId,
  })
);

export type RuleDataSource = t.TypeOf<typeof RuleDataSource>;
export const RuleDataSource = t.union([DataSourceIndexPatterns, DataSourceDataView]);

// -------------------------------------------------------------------------------------------------
// Rule data query

export enum KqlQueryType {
  'inline_query' = 'inline_query',
  'saved_query' = 'saved_query',
}

export type InlineKqlQuery = t.TypeOf<typeof InlineKqlQuery>;
export const InlineKqlQuery = t.exact(
  t.type({
    type: t.literal(KqlQueryType.inline_query),
    query: RuleQuery,
    language: KqlQueryLanguage,
    filters: RuleFilterArray,
  })
);

export type SavedKqlQuery = t.TypeOf<typeof SavedKqlQuery>;
export const SavedKqlQuery = t.exact(
  t.type({
    type: t.literal(KqlQueryType.saved_query),
    saved_query_id: saved_id,
  })
);

export type RuleKqlQuery = t.TypeOf<typeof RuleKqlQuery>;
export const RuleKqlQuery = t.union([InlineKqlQuery, SavedKqlQuery]);

export type RuleEqlQuery = t.TypeOf<typeof RuleEqlQuery>;
export const RuleEqlQuery = t.exact(
  t.type({
    query: RuleQuery,
    language: t.literal('eql'),
    filters: RuleFilterArray,
  })
);

export type RuleEsqlQuery = t.TypeOf<typeof RuleEsqlQuery>;
export const RuleEsqlQuery = t.exact(
  t.type({
    query: RuleQuery,
    language: t.literal('esql'),
  })
);

// -------------------------------------------------------------------------------------------------
// Rule schedule

export type RuleSchedule = t.TypeOf<typeof RuleSchedule>;
export const RuleSchedule = t.exact(
  t.type({
    interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
    lookback: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
  })
);

// -------------------------------------------------------------------------------------------------
// Rule name override

export type RuleNameOverrideObject = t.TypeOf<typeof RuleNameOverrideObject>;
export const RuleNameOverrideObject = t.exact(
  t.type({
    field_name: RuleNameOverrideFieldName,
  })
);

// -------------------------------------------------------------------------------------------------
// Timestamp override

export type TimestampOverrideObject = t.TypeOf<typeof TimestampOverrideObject>;
export const TimestampOverrideObject = t.exact(
  t.type({
    field_name: TimestampOverrideFieldName,
    fallback_disabled: TimestampOverrideFallbackDisabled,
  })
);

// -------------------------------------------------------------------------------------------------
// Reference to a timeline template

export type TimelineTemplateReference = t.TypeOf<typeof TimelineTemplateReference>;
export const TimelineTemplateReference = t.exact(
  t.type({
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
  })
);

// -------------------------------------------------------------------------------------------------
// Building block

export type BuildingBlockObject = t.TypeOf<typeof BuildingBlockObject>;
export const BuildingBlockObject = t.exact(
  t.type({
    type: BuildingBlockType,
  })
);
