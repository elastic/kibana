/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { FetchCustomPipelineApiLogic } from '../../../api/index/fetch_custom_pipeline_api_logic';

import { IndexNameLogic } from '../index_name_logic';

import {
  IndexPipelinesConfigurationsLogic,
  IndexPipelinesConfigurationsValues,
} from './pipelines_json_configurations_logic';

const indexName = 'unit-test-index';
const DEFAULT_VALUES: IndexPipelinesConfigurationsValues = {
  indexName,
  indexPipelinesData: undefined,
  pipelineNames: [],
  pipelines: {},
  selectedPipeline: undefined,
  selectedPipelineId: '',
  selectedPipelineJSON: '',
};

describe('IndexPipelinesConfigurationsLogic', () => {
  const { mount } = new LogicMounter(IndexPipelinesConfigurationsLogic);
  const { mount: indexNameMount } = new LogicMounter(IndexNameLogic);
  const { mount: mountFetchCustomPipelineApiLogic } = new LogicMounter(FetchCustomPipelineApiLogic);

  beforeEach(async () => {
    jest.clearAllMocks();
    const indexNameLogic = indexNameMount();
    mountFetchCustomPipelineApiLogic();
    mount();
    indexNameLogic.actions.setIndexName(indexName);
  });

  it('has expected default values', () => {
    expect(IndexPipelinesConfigurationsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('selectPipeline updates selectedPipelineId', () => {
      IndexPipelinesConfigurationsLogic.actions.selectPipeline('unit-test');

      expect(IndexPipelinesConfigurationsLogic.values.selectedPipelineId).toEqual('unit-test');
    });
    it('fetchIndexPipelinesDataSuccess selects index ingest pipeline if found', async () => {
      const pipelines = {
        'ent-search-generic-ingest': {
          version: 1,
        },
        [indexName]: {
          processors: [],
          version: 1,
        },
      };
      FetchCustomPipelineApiLogic.actions.apiSuccess(pipelines);
      await nextTick();

      expect(IndexPipelinesConfigurationsLogic.values.selectedPipelineId).toEqual(indexName);
    });
    it('fetchIndexPipelinesDataSuccess selects first pipeline as default pipeline', async () => {
      const pipelines = {
        'ent-search-generic-ingest': {
          version: 1,
        },
      };
      FetchCustomPipelineApiLogic.actions.apiSuccess(pipelines);
      await nextTick();

      expect(IndexPipelinesConfigurationsLogic.values.selectedPipelineId).toEqual(
        'ent-search-generic-ingest'
      );
    });
  });

  describe('selectors', () => {
    it('pipelineNames returns names of pipelines', async () => {
      const pipelines = {
        'ent-search-generic-ingest': {
          version: 1,
        },
        [indexName]: {
          processors: [],
          version: 1,
        },
      };
      FetchCustomPipelineApiLogic.actions.apiSuccess(pipelines);
      await nextTick();

      expect(IndexPipelinesConfigurationsLogic.values.pipelineNames).toEqual([
        'ent-search-generic-ingest',
        indexName,
      ]);
    });
    it('selectedPipeline returns full pipeline', async () => {
      const pipelines = {
        'ent-search-generic-ingest': {
          version: 1,
        },
        foo: {
          version: 2,
        },
        bar: {
          version: 3,
        },
      };
      FetchCustomPipelineApiLogic.actions.apiSuccess(pipelines);
      IndexPipelinesConfigurationsLogic.actions.selectPipeline('foo');
      await nextTick();

      expect(IndexPipelinesConfigurationsLogic.values.selectedPipeline).toEqual(pipelines.foo);
      expect(IndexPipelinesConfigurationsLogic.values.selectedPipelineJSON.length).toBeGreaterThan(
        0
      );
    });
  });
});
