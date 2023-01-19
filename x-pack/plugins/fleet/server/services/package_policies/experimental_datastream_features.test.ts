/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import type { NewPackagePolicy, PackagePolicy } from '../../types';

import { handleExperimentalDatastreamFeatureOptIn } from './experimental_datastream_features';

function getNewTestPackagePolicy({
  isSyntheticSourceEnabled,
  isTSDBEnabled,
  isDocValueOnlyNumeric,
  isDocValueOnlyOther,
}: {
  isSyntheticSourceEnabled: boolean;
  isTSDBEnabled: boolean;
  isDocValueOnlyNumeric: boolean;
  isDocValueOnlyOther: boolean;
}): NewPackagePolicy {
  const packagePolicy: NewPackagePolicy = {
    name: 'Test policy',
    policy_id: 'agent-policy',
    description: 'Test policy description',
    namespace: 'default',
    enabled: true,
    inputs: [],
    package: {
      name: 'test',
      title: 'Test',
      version: '0.0.1',
      experimental_data_stream_features: [
        {
          data_stream: 'metrics-test.test',
          features: {
            synthetic_source: isSyntheticSourceEnabled,
            tsdb: isTSDBEnabled,
            doc_value_only_numeric: isDocValueOnlyNumeric,
            doc_value_only_other: isDocValueOnlyOther,
          },
        },
      ],
    },
  };

  return packagePolicy;
}

function getExistingTestPackagePolicy({
  isSyntheticSourceEnabled,
  isTSDBEnabled,
  isDocValueOnlyNumeric,
  isDocValueOnlyOther,
}: {
  isSyntheticSourceEnabled: boolean;
  isTSDBEnabled: boolean;
  isDocValueOnlyNumeric: boolean;
  isDocValueOnlyOther: boolean;
}): PackagePolicy {
  const packagePolicy: PackagePolicy = {
    id: 'test-policy',
    name: 'Test policy',
    policy_id: 'agent-policy',
    description: 'Test policy description',
    namespace: 'default',
    enabled: true,
    inputs: [],
    package: {
      name: 'test',
      title: 'Test',
      version: '0.0.1',
      experimental_data_stream_features: [
        {
          data_stream: 'metrics-test.test',
          features: {
            synthetic_source: isSyntheticSourceEnabled,
            tsdb: isTSDBEnabled,
            doc_value_only_numeric: isDocValueOnlyNumeric,
            doc_value_only_other: isDocValueOnlyOther,
          },
        },
      ],
    },
    revision: 1,
    created_by: 'system',
    created_at: '2022-01-01T00:00:00.000Z',
    updated_by: 'system',
    updated_at: '2022-01-01T00:00:00.000Z',
  };

  return packagePolicy;
}

describe('experimental_datastream_features', () => {
  beforeEach(() => {
    soClient.get.mockClear();
    esClient.cluster.getComponentTemplate.mockClear();
    esClient.cluster.putComponentTemplate.mockClear();

    esClient.cluster.getComponentTemplate.mockResolvedValueOnce({
      component_templates: [
        {
          name: 'metrics-test.test@package',
          component_template: {
            template: {
              settings: {},
              mappings: {
                _source: {},
                properties: {
                  test_dimension: {
                    type: 'keyword',
                    time_series_dimension: true,
                  },
                },
              },
            },
          },
        },
      ],
    });
  });

  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  describe('when package policy does not exist (create)', () => {
    beforeEach(() => {
      soClient.get.mockResolvedValueOnce({
        attributes: {
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.test',
              features: {
                synthetic_source: false,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
              },
            },
          ],
        },
        id: 'mocked',
        type: 'mocked',
        references: [],
      });
    });
    it('updates component template', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: true,
        isTSDBEnabled: false,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: false,
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            template: expect.objectContaining({
              mappings: expect.objectContaining({ _source: { mode: 'synthetic' } }),
            }),
          }),
        })
      );
    });

    it('should update index template', async () => {
      const packagePolicy = getNewTestPackagePolicy({
        isSyntheticSourceEnabled: false,
        isTSDBEnabled: true,
        isDocValueOnlyNumeric: false,
        isDocValueOnlyOther: false,
      });

      esClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: 'metrics-test.test',
            index_template: {
              template: {
                settings: {},
                mappings: {},
              },
              composed_of: [],
              index_patterns: '',
            },
          },
        ],
      });

      await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

      expect(esClient.indices.getIndexTemplate).toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            template: expect.objectContaining({
              settings: expect.objectContaining({
                index: { mode: 'time_series' },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('when package policy exists (update)', () => {
    describe('when opt in status in unchanged', () => {
      it('does not update component template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        soClient.get.mockResolvedValueOnce({
          attributes: {
            experimental_data_stream_features: [
              {
                data_stream: 'metrics-test.test',
                features: {
                  synthetic_source: true,
                  tsdb: false,
                  doc_value_only_numeric: false,
                  doc_value_only_other: false,
                },
              },
            ],
          },
          id: 'mocked',
          type: 'mocked',
          references: [],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).not.toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      });
    });

    describe('when opt in status is changed', () => {
      beforeEach(() => {
        soClient.get.mockResolvedValueOnce({
          attributes: {
            experimental_data_stream_features: [
              {
                data_stream: 'metrics-test.test',
                features: {
                  synthetic_source: false,
                  tsdb: false,
                  doc_value_only_numeric: false,
                  doc_value_only_other: false,
                },
              },
            ],
          },
          id: 'mocked',
          type: 'mocked',
          references: [],
        });
      });
      it('updates component template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: true,
          isTSDBEnabled: false,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.cluster.getComponentTemplate).toHaveBeenCalled();
        expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              template: expect.objectContaining({
                mappings: expect.objectContaining({ _source: { mode: 'synthetic' } }),
              }),
            }),
          })
        );
      });

      it('should update index template', async () => {
        const packagePolicy = getExistingTestPackagePolicy({
          isSyntheticSourceEnabled: false,
          isTSDBEnabled: true,
          isDocValueOnlyNumeric: false,
          isDocValueOnlyOther: false,
        });

        esClient.indices.getIndexTemplate.mockResolvedValueOnce({
          index_templates: [
            {
              name: 'metrics-test.test',
              index_template: {
                template: {
                  settings: {},
                  mappings: {},
                },
                composed_of: [],
                index_patterns: '',
              },
            },
          ],
        });

        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        expect(esClient.indices.getIndexTemplate).toHaveBeenCalled();
        expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              template: expect.objectContaining({
                settings: expect.objectContaining({
                  index: { mode: 'time_series' },
                }),
              }),
            }),
          })
        );
      });
    });
  });
});
