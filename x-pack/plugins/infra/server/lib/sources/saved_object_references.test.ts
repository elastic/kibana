/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSourceConfiguration } from '../../../common/source_configuration/source_configuration';
import {
  extractSavedObjectReferences,
  resolveSavedObjectReferences,
} from './saved_object_references';

describe('extractSavedObjectReferences function', () => {
  it('extracts log index pattern references', () => {
    const { attributes, references } = extractSavedObjectReferences(
      sourceConfigurationWithIndexPatternReference
    );

    expect(references).toMatchObject([{ id: 'INDEX_PATTERN_ID' }]);
    expect(attributes).toHaveProperty(['logIndices', 'indexPatternId'], references[0].name);
  });

  it('ignores log index name references', () => {
    const { attributes, references } = extractSavedObjectReferences(
      sourceConfigurationWithIndexNameReference
    );

    expect(references).toHaveLength(0);
    expect(attributes).toHaveProperty(['logIndices', 'indexName'], 'INDEX_NAME');
  });
});

describe('resolveSavedObjectReferences function', () => {
  it('is the inverse operation of extractSavedObjectReferences', () => {
    const { attributes, references } = extractSavedObjectReferences(
      sourceConfigurationWithIndexPatternReference
    );

    const resolvedSourceConfiguration = resolveSavedObjectReferences(attributes, references);

    expect(resolvedSourceConfiguration).toEqual(sourceConfigurationWithIndexPatternReference);
  });

  it('ignores additional saved object references', () => {
    const { attributes, references } = extractSavedObjectReferences(
      sourceConfigurationWithIndexPatternReference
    );

    const resolvedSourceConfiguration = resolveSavedObjectReferences(attributes, [
      ...references,
      { name: 'log_index_pattern_1', id: 'SOME_ID', type: 'index-pattern' },
    ]);

    expect(resolvedSourceConfiguration).toEqual(sourceConfigurationWithIndexPatternReference);
  });

  it('ignores log index name references', () => {
    const { attributes, references } = extractSavedObjectReferences(
      sourceConfigurationWithIndexNameReference
    );

    const resolvedSourceConfiguration = resolveSavedObjectReferences(attributes, [
      ...references,
      { name: 'log_index_pattern_0', id: 'SOME_ID', type: 'index-pattern' },
    ]);

    expect(resolvedSourceConfiguration).toEqual(sourceConfigurationWithIndexNameReference);
  });
});

const sourceConfigurationWithIndexPatternReference: InfraSourceConfiguration = {
  name: 'NAME',
  description: 'DESCRIPTION',
  fields: {
    container: 'CONTAINER_FIELD',
    host: 'HOST_FIELD',
    message: ['MESSAGE_FIELD'],
    pod: 'POD_FIELD',
    tiebreaker: 'TIEBREAKER_FIELD',
    timestamp: 'TIMESTAMP_FIELD',
  },
  logColumns: [],
  logIndices: {
    type: 'index_pattern',
    indexPatternId: 'INDEX_PATTERN_ID',
  },
  metricAlias: 'METRIC_ALIAS',
  anomalyThreshold: 0,
  inventoryDefaultView: 'INVENTORY_DEFAULT_VIEW',
  metricsExplorerDefaultView: 'METRICS_EXPLORER_DEFAULT_VIEW',
};

const sourceConfigurationWithIndexNameReference: InfraSourceConfiguration = {
  ...sourceConfigurationWithIndexPatternReference,
  logIndices: {
    type: 'index_name',
    indexName: 'INDEX_NAME',
  },
};
