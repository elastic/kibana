/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataView, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import { TIEBREAKER_FIELD, TIMESTAMP_FIELD } from '../constants';
import { ResolveLogViewError } from './errors';
import { LogViewAttributes, LogViewColumnConfiguration, LogViewsStaticConfig } from './types';

export type ResolvedLogViewField = FieldSpec;

export interface ResolvedLogView {
  name: string;
  description: string;
  indices: string;
  timestampField: string;
  tiebreakerField: string;
  messageField: string[];
  fields: ResolvedLogViewField[];
  runtimeMappings: estypes.MappingRuntimeFields;
  columns: LogViewColumnConfiguration[];
  dataViewReference: DataView;
}

export const resolveLogView = async (
  logViewId: string,
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract,
  config: LogViewsStaticConfig
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type === 'index_name') {
    return await resolveLegacyReference(logViewId, logViewAttributes, dataViewsService, config);
  } else {
    return await resolveDataViewReference(logViewAttributes, dataViewsService);
  }
};

const resolveLegacyReference = async (
  logViewId: string,
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract,
  config: LogViewsStaticConfig
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type !== 'index_name') {
    throw new Error('This function can only resolve legacy references');
  }

  const indices = logViewAttributes.logIndices.indexName;

  const dataViewReference = await dataViewsService
    .create(
      {
        id: `log-view-${logViewId}`,
        title: indices,
        timeFieldName: TIMESTAMP_FIELD,
        allowNoIndex: true,
      },
      false,
      false
    )
    .catch((error) => {
      throw new ResolveLogViewError(`Failed to create Data View reference: ${error}`, error);
    });

  return {
    indices,
    timestampField: TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: config.messageFields,
    fields: dataViewReference.fields,
    runtimeMappings: {},
    columns: logViewAttributes.logColumns,
    name: logViewAttributes.name,
    description: logViewAttributes.description,
    dataViewReference,
  };
};

const resolveDataViewReference = async (
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type !== 'data_view') {
    throw new Error('This function can only resolve Kibana data view references');
  }

  const { dataViewId } = logViewAttributes.logIndices;

  const dataView = await dataViewsService.get(dataViewId).catch((error) => {
    throw new ResolveLogViewError(`Failed to fetch data view "${dataViewId}": ${error}`, error);
  });

  return {
    indices: dataView.title,
    timestampField: dataView.timeFieldName ?? TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: ['message'],
    fields: dataView.fields,
    runtimeMappings: resolveRuntimeMappings(dataView),
    columns: logViewAttributes.logColumns,
    name: logViewAttributes.name,
    description: logViewAttributes.description,
    dataViewReference: dataView,
  };
};

// this might take other sources of runtime fields into account in the future
const resolveRuntimeMappings = (dataView: DataView): estypes.MappingRuntimeFields => {
  return dataView.getRuntimeMappings();
};
