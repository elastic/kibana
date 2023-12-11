/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogIndexReference, LogView, LogViewAttributes } from '@kbn/logs-shared-plugin/common';
import { LogIndexReference as SourceConfigurationLogIndexReference } from '../../common/source_configuration/source_configuration';
import { InfraSource } from '../lib/sources';

export const mapSourceToLogView = (sourceConfiguration: InfraSource): LogView => {
  return {
    id: sourceConfiguration.id,
    version: sourceConfiguration.version,
    updatedAt: sourceConfiguration.updatedAt,
    origin: `infra-source-${sourceConfiguration.origin}`,
    attributes: getAttributesFromSourceConfiguration(sourceConfiguration),
  };
};

export const getAttributesFromSourceConfiguration = ({
  configuration: { name, description, logIndices, logColumns },
}: InfraSource): LogViewAttributes => ({
  name,
  description,
  logIndices: getLogIndicesFromSourceConfigurationLogIndices(logIndices),
  logColumns,
});

const getLogIndicesFromSourceConfigurationLogIndices = (
  logIndices: SourceConfigurationLogIndexReference
): LogIndexReference =>
  logIndices.type === 'index_pattern'
    ? {
        type: 'data_view',
        dataViewId: logIndices.indexPatternId,
      }
    : logIndices;
