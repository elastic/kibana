/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogSourceConfigurationProperties,
  LogSourceColumnConfiguration,
} from './log_source_configuration';
import { IndexPatternsContract, IndexPattern } from '../../../../../src/plugins/data/common';

export interface ResolvedLogSourceConfiguration {
  name: string;
  description: string;
  indices: string;
  timestampField: string;
  tiebreakerField: string;
  messageField: string[];
  fields: IndexPattern['fields'];
  columns: LogSourceColumnConfiguration[];
}

export const resolveLogSourceConfiguration = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: IndexPatternsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type === 'index_name') {
    return await resolveLegacyReference(sourceConfiguration, indexPatternsService);
  } else {
    return await resolveKibanaIndexPatternReference(sourceConfiguration, indexPatternsService);
  }
};

const resolveLegacyReference = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: IndexPatternsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type !== 'index_name') {
    throw new Error('This function can only resolve legacy references');
  }

  const fields = await indexPatternsService.getFieldsForWildcard({
    pattern: sourceConfiguration.logIndices.indexName,
    allowNoIndex: true,
  });

  return {
    indices: sourceConfiguration.logIndices.indexName,
    timestampField: sourceConfiguration.fields.timestamp,
    tiebreakerField: sourceConfiguration.fields.tiebreaker,
    messageField: sourceConfiguration.fields.message,
    fields,
    columns: sourceConfiguration.logColumns,
    name: sourceConfiguration.name,
    description: sourceConfiguration.description,
  };
};

const resolveKibanaIndexPatternReference = async (
  sourceConfiguration: LogSourceConfigurationProperties,
  indexPatternsService: IndexPatternsContract
): Promise<ResolvedLogSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type !== 'index_pattern') {
    throw new Error('This function can only resolve Kibana Index Pattern references');
  }

  const indexPattern = await indexPatternsService.get(
    sourceConfiguration.logIndices.indexPatternId
  );

  return {
    indices: indexPattern.title,
    timestampField: indexPattern.timeFieldName ?? '@timestamp',
    tiebreakerField: '_doc',
    messageField: ['message'],
    fields: indexPattern.fields,
    columns: sourceConfiguration.logColumns,
    name: sourceConfiguration.name,
    description: sourceConfiguration.description,
  };
};
