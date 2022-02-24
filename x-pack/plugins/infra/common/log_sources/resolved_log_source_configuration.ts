/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataView, DataViewsContract } from '../../../../../src/plugins/data_views/common';
import { TIMESTAMP_FIELD, TIEBREAKER_FIELD } from '../constants';
import { ResolveLogSourceConfigurationError } from './errors';
import {
  LogSourceColumnConfiguration,
  LogSourceConfigurationProperties,
} from './log_source_configuration';

export interface ResolvedLogSourceConfiguration {
  name: string;
  description: string;
  indices: string;
  timestampField: string;
  tiebreakerField: string;
  messageField: string[];
  fields: DataView['fields'];
  runtimeMappings: estypes.MappingRuntimeFields;
  columns: LogSourceColumnConfiguration[];
}

export const resolveLogSourceConfiguration = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: DataViewsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type === 'index_name') {
    return await resolveLegacyReference(sourceConfiguration, indexPatternsService);
  } else {
    return await resolveKibanaIndexPatternReference(sourceConfiguration, indexPatternsService);
  }
};

const resolveLegacyReference = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: DataViewsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type !== 'index_name') {
    throw new Error('This function can only resolve legacy references');
  }

  const indices = sourceConfiguration.logIndices.indexName;

  const fields = await indexPatternsService
    .getFieldsForWildcard({
      pattern: indices,
      allowNoIndex: true,
    })
    .catch((error) => {
      throw new ResolveLogSourceConfigurationError(
        `Failed to fetch fields for indices "${indices}": ${error}`,
        error
      );
    });

  return {
    indices: sourceConfiguration.logIndices.indexName,
    timestampField: TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: sourceConfiguration.fields.message,
    // @ts-ignore
    fields,
    runtimeMappings: {},
    columns: sourceConfiguration.logColumns,
    name: sourceConfiguration.name,
    description: sourceConfiguration.description,
  };
};

const resolveKibanaIndexPatternReference = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: DataViewsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type !== 'index_pattern') {
    throw new Error('This function can only resolve Kibana Index Pattern references');
  }

  const { indexPatternId } = sourceConfiguration.logIndices;

  const indexPattern = await indexPatternsService.get(indexPatternId).catch((error) => {
    throw new ResolveLogSourceConfigurationError(
      `Failed to fetch index pattern "${indexPatternId}": ${error}`,
      error
    );
  });

  return {
    indices: indexPattern.title,
    timestampField: indexPattern.timeFieldName ?? TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: ['message'],
    fields: indexPattern.fields,
    runtimeMappings: resolveRuntimeMappings(indexPattern),
    columns: sourceConfiguration.logColumns,
    name: sourceConfiguration.name,
    description: sourceConfiguration.description,
  };
};

// this might take other sources of runtime fields into account in the future
const resolveRuntimeMappings = (indexPattern: DataView): estypes.MappingRuntimeFields => {
  return indexPattern.getRuntimeMappings();
};
