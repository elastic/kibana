/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { CreateEngineApiLogic } from '../../api/engines/create_engine_api_logic';

import { CreateEngineLogic, CreateEngineLogicValues } from './create_engine_logic';

const DEFAULT_VALUES: CreateEngineLogicValues = {
  createDisabled: true,
  createEngineError: undefined,
  createEngineStatus: Status.IDLE,
  engineName: '',
  engineNameStatus: 'incomplete',
  formDisabled: false,
  indicesStatus: 'incomplete',
  selectedIndices: [],
};

const VALID_ENGINE_NAME = 'unit-test-001';
const INVALID_ENGINE_NAME = 'TEST';
const VALID_INDICES_DATA = [{ name: 'search-index-01' }] as ElasticsearchIndexWithIngestion[];

describe('CreateEngineLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(CreateEngineApiLogic);
  const { mount } = new LogicMounter(CreateEngineLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });

  it('has expected defaults', () => {
    expect(CreateEngineLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    it('createEngine makes expected request action', () => {
      jest.spyOn(CreateEngineLogic.actions, 'createEngineRequest');

      CreateEngineLogic.actions.setEngineName(VALID_ENGINE_NAME);
      CreateEngineLogic.actions.setSelectedIndices(VALID_INDICES_DATA);

      CreateEngineLogic.actions.createEngine();

      expect(CreateEngineLogic.actions.createEngineRequest).toHaveBeenCalledTimes(1);
      expect(CreateEngineLogic.actions.createEngineRequest).toHaveBeenCalledWith({
        engineName: VALID_ENGINE_NAME,
        indices: ['search-index-01'],
      });
    });
    it('engineCreated is handled', () => {
      jest.spyOn(CreateEngineLogic.actions, 'fetchEngines');
      jest.spyOn(CreateEngineLogic.actions, 'closeEngineCreate');

      CreateEngineApiLogic.actions.apiSuccess({
        created: '',
        indices: ['search-index-001'],
        name: 'unit-test',
        updated: '',
      });

      expect(CreateEngineLogic.actions.fetchEngines).toHaveBeenCalledTimes(1);
      expect(CreateEngineLogic.actions.closeEngineCreate).toHaveBeenCalledTimes(1);
    });
  });
  describe('selectors', () => {
    describe('engineNameStatus', () => {
      it('returns incomplete with empty engine name', () => {
        expect(CreateEngineLogic.values.engineNameStatus).toEqual('incomplete');
      });
      it('returns complete with valid engine name', () => {
        CreateEngineLogic.actions.setEngineName(VALID_ENGINE_NAME);

        expect(CreateEngineLogic.values.engineNameStatus).toEqual('complete');
      });
      it('returns warning for invalid engine name', () => {
        CreateEngineLogic.actions.setEngineName(INVALID_ENGINE_NAME);

        expect(CreateEngineLogic.values.engineNameStatus).toEqual('warning');
      });
    });
    describe('indicesStatus', () => {
      it('returns incomplete with 0 indices', () => {
        expect(CreateEngineLogic.values.indicesStatus).toEqual('incomplete');
      });
      it('returns complete with at least one index', () => {
        CreateEngineLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        expect(CreateEngineLogic.values.indicesStatus).toEqual('complete');
      });
    });
    describe('createDisabled', () => {
      it('false with valid data', () => {
        CreateEngineLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        CreateEngineLogic.actions.setEngineName(VALID_ENGINE_NAME);

        expect(CreateEngineLogic.values.createDisabled).toEqual(false);
      });
      it('true with invalid data', () => {
        CreateEngineLogic.actions.setSelectedIndices(VALID_INDICES_DATA);
        CreateEngineLogic.actions.setEngineName(INVALID_ENGINE_NAME);

        expect(CreateEngineLogic.values.createDisabled).toEqual(true);
      });
    });
    describe('formDisabled', () => {
      it('returns true while create request in progress', () => {
        CreateEngineApiLogic.actions.makeRequest({
          engineName: VALID_ENGINE_NAME,
          indices: [VALID_INDICES_DATA[0].name],
        });

        expect(CreateEngineLogic.values.formDisabled).toEqual(true);
      });
    });
  });
});
