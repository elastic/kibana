/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IndexPattern, IndexPatternsContract } from '../../../../../src/plugins/data/common';
import { ObjectEntries } from '../utility_types';
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
  fields: IndexPattern['fields'];
  runtimeMappings: estypes.MappingRuntimeFields;
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
    timestampField: sourceConfiguration.fields.timestamp,
    tiebreakerField: sourceConfiguration.fields.tiebreaker,
    messageField: sourceConfiguration.fields.message,
    fields,
    runtimeMappings: {},
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

  const { indexPatternId } = sourceConfiguration.logIndices;

  const indexPattern = await indexPatternsService.get(indexPatternId).catch((error) => {
    throw new ResolveLogSourceConfigurationError(
      `Failed to fetch index pattern "${indexPatternId}": ${error}`,
      error
    );
  });

  return {
    indices: indexPattern.title,
    timestampField: indexPattern.timeFieldName ?? '@timestamp',
    tiebreakerField: '_doc',
    messageField: ['message'],
    fields: indexPattern.fields,
    runtimeMappings: resolveRuntimeMappings(indexPattern),
    columns: sourceConfiguration.logColumns,
    name: sourceConfiguration.name,
    description: sourceConfiguration.description,
  };
};

// this might take other sources of runtime fields into account in the future
const resolveRuntimeMappings = (indexPattern: IndexPattern): estypes.MappingRuntimeFields => {
  const { runtimeFields } = indexPattern.getComputedFields();

  const runtimeMappingsFromIndexPattern = (
    Object.entries(runtimeFields) as ObjectEntries<typeof runtimeFields>
  ).reduce<estypes.MappingRuntimeFields>(
    (accumulatedMappings, [runtimeFieldName, runtimeFieldSpec]) => ({
      ...accumulatedMappings,
      [runtimeFieldName]: {
        type: runtimeFieldSpec.type,
        ...(runtimeFieldSpec.script != null
          ? {
              script: {
                lang: 'painless', // required in the es types
                source: runtimeFieldSpec.script.source,
              },
            }
          : {}),
      },
    }),
    {}
  );

  return runtimeMappingsFromIndexPattern;
};
