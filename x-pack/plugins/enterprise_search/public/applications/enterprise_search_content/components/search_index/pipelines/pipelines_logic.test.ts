/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex } from '../../../__mocks__/view_index.mock';

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { UpdatePipelineApiLogic } from '../../../api/connector/update_pipeline_api_logic';
import { FetchCustomPipelineApiLogic } from '../../../api/index/fetch_custom_pipeline_api_logic';
import { FetchIndexApiLogic } from '../../../api/index/fetch_index_api_logic';

import { PipelinesLogic } from './pipelines_logic';

const DEFAULT_PIPELINE_VALUES = {
  extract_binary_content: true,
  name: 'ent-search-generic-ingestion',
  reduce_whitespace: true,
  run_ml_inference: false,
};

const DEFAULT_VALUES = {
  canSetPipeline: true,
  canUseMlInferencePipeline: false,
  customPipelineData: undefined,
  defaultPipelineValues: DEFAULT_PIPELINE_VALUES,
  defaultPipelineValuesData: undefined,
  hasIndexIngestionPipeline: false,
  index: undefined,
  indexName: '',
  mlInferencePipelineProcessors: undefined,
  pipelineName: DEFAULT_PIPELINE_VALUES.name,
  pipelineState: DEFAULT_PIPELINE_VALUES,
  showAddMlInferencePipelineModal: false,
  showModal: false,
};

describe('PipelinesLogic', () => {
  const { mount } = new LogicMounter(PipelinesLogic);
  const { mount: mountFetchIndexApiLogic } = new LogicMounter(FetchIndexApiLogic);
  const { mount: mountUpdatePipelineLogic } = new LogicMounter(UpdatePipelineApiLogic);
  const { mount: mountFetchCustomPipelineApiLogic } = new LogicMounter(FetchCustomPipelineApiLogic);
  const { clearFlashMessages, flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  const newPipeline = {
    ...DEFAULT_PIPELINE_VALUES,
    name: 'new_pipeline_name',
    run_ml_inference: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchIndexApiLogic();
    mountFetchCustomPipelineApiLogic();
    mountUpdatePipelineLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(PipelinesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('should set showModal to false and call fetchApiSuccess', async () => {
      FetchIndexApiLogic.actions.apiSuccess(connectorIndex);
      PipelinesLogic.actions.fetchIndexApiSuccess = jest.fn();
      PipelinesLogic.actions.setPipelineState(newPipeline);
      PipelinesLogic.actions.openModal();
      PipelinesLogic.actions.apiSuccess({ connectorId: 'a', pipeline: newPipeline });
      expect(PipelinesLogic.values).toEqual({
        ...DEFAULT_VALUES,
        index: {
          ...connectorIndex,
          connector: { ...connectorIndex.connector },
        },
        indexName: 'connector',
      });
      expect(flashSuccessToast).toHaveBeenCalled();
      expect(PipelinesLogic.actions.fetchIndexApiSuccess).toHaveBeenCalledWith({
        ...connectorIndex,
        connector: {
          ...connectorIndex.connector,
          pipeline: newPipeline,
        },
      });
    });
    it('should set pipelineState on setPipeline', () => {
      PipelinesLogic.actions.setPipelineState({
        ...DEFAULT_PIPELINE_VALUES,
        name: 'new_pipeline_name',
      });
      expect(PipelinesLogic.values).toEqual({
        ...DEFAULT_VALUES,
        hasIndexIngestionPipeline: true,
        pipelineName: 'new_pipeline_name',
        pipelineState: { ...DEFAULT_PIPELINE_VALUES, name: 'new_pipeline_name' },
      });
    });
    describe('makeRequest', () => {
      it('should call clearFlashMessages', () => {
        PipelinesLogic.actions.makeRequest({ connectorId: 'a', pipeline: DEFAULT_PIPELINE_VALUES });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
    describe('openModal', () => {
      it('should set showModal to true', () => {
        PipelinesLogic.actions.openModal();
        expect(PipelinesLogic.values).toEqual({ ...DEFAULT_VALUES, showModal: true });
      });
    });
    describe('closeModal', () => {
      it('should set showModal to false', () => {
        PipelinesLogic.actions.openModal();
        PipelinesLogic.actions.closeModal();
        expect(PipelinesLogic.values).toEqual({ ...DEFAULT_VALUES, showModal: false });
      });
    });
    describe('apiError', () => {
      it('should call flashAPIError', () => {
        PipelinesLogic.actions.apiError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
    describe('apiSuccess', () => {
      it('should call flashSuccessToast', () => {
        PipelinesLogic.actions.apiSuccess({ connectorId: 'a', pipeline: newPipeline });
        expect(flashSuccessToast).toHaveBeenCalledWith('Pipelines successfully updated');
      });
    });
    describe('createCustomPipelineError', () => {
      it('should call flashAPIError', () => {
        PipelinesLogic.actions.createCustomPipelineError('error' as any);
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
    describe('createCustomPipelineSuccess', () => {
      it('should call flashSuccessToast', () => {
        PipelinesLogic.actions.setPipelineState = jest.fn();
        PipelinesLogic.actions.savePipeline = jest.fn();
        PipelinesLogic.actions.fetchCustomPipeline = jest.fn();
        PipelinesLogic.actions.fetchIndexApiSuccess(connectorIndex);
        PipelinesLogic.actions.createCustomPipelineSuccess({ created: ['a', 'b'] });
        expect(flashSuccessToast).toHaveBeenCalledWith('Custom pipeline successfully created');
        expect(PipelinesLogic.actions.setPipelineState).toHaveBeenCalledWith({
          ...PipelinesLogic.values.pipelineState,
          name: 'a',
        });
        expect(PipelinesLogic.actions.savePipeline).toHaveBeenCalled();
        expect(PipelinesLogic.actions.fetchCustomPipeline).toHaveBeenCalled();
      });
    });
    describe('fetchIndexApiSuccess', () => {
      it('should set pipelineState if not editing', () => {
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, pipeline: newPipeline },
        });
        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          canUseMlInferencePipeline: true,
          hasIndexIngestionPipeline: true,
          index: {
            ...connectorIndex,
            connector: { ...connectorIndex.connector, pipeline: newPipeline },
          },
          indexName: 'connector',
          pipelineName: 'new_pipeline_name',
          pipelineState: newPipeline,
        });
      });
      it('should not set configState if modal is open', () => {
        PipelinesLogic.actions.openModal();
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, pipeline: newPipeline },
        });
        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          index: {
            ...connectorIndex,
            connector: { ...connectorIndex.connector, pipeline: newPipeline },
          },
          indexName: 'connector',
          showModal: true,
        });
      });
    });
    describe('savePipeline', () => {
      it('should call makeRequest', () => {
        PipelinesLogic.actions.makeRequest = jest.fn();
        PipelinesLogic.actions.fetchIndexApiSuccess(connectorIndex);
        PipelinesLogic.actions.savePipeline();
        expect(PipelinesLogic.actions.makeRequest).toHaveBeenCalledWith({
          connectorId: '2',
          pipeline: DEFAULT_PIPELINE_VALUES,
        });
      });
    });
    describe('fetchCustomPipelineSuccess', () => {
      it('should support api indices with custom ingest pipelines', () => {
        PipelinesLogic.actions.fetchIndexApiSuccess({
          ...apiIndex,
        });
        const indexName = apiIndex.name;
        const indexPipelines: Record<string, IngestPipeline> = {
          [indexName]: {
            processors: [],
            version: 1,
          },
          [`${indexName}@custom`]: {
            processors: [],
            version: 1,
          },
          [`${indexName}@ml-inference`]: {
            processors: [],
            version: 1,
          },
        };
        PipelinesLogic.actions.fetchCustomPipelineSuccess(indexPipelines);

        expect(PipelinesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          customPipelineData: indexPipelines,
          index: {
            ...apiIndex,
          },
          indexName,
          pipelineName: indexName,
          canSetPipeline: false,
          hasIndexIngestionPipeline: true,
          canUseMlInferencePipeline: true,
        });
      });
    });
  });
});
