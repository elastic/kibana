/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';
import { EngineDetails, EngineTypes } from '../engine/types';

import { EnginesLogic } from '.';

describe('EnginesLogic', () => {
  const { mount } = new LogicMounter(EnginesLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    engines: [],
    enginesMeta: DEFAULT_META,
    enginesLoading: true,
    metaEngines: [],
    metaEnginesMeta: DEFAULT_META,
    metaEnginesLoading: true,
  };

  const MOCK_ENGINE = {
    name: 'hello-world',
    created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
    document_count: 50,
    field_count: 10,
  } as EngineDetails;
  const MOCK_META = {
    page: {
      current: 1,
      size: 10,
      total_results: 100,
      total_pages: 10,
    },
  };
  const MOCK_ENGINES_API_RESPONSE = {
    results: [MOCK_ENGINE],
    meta: MOCK_META,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EnginesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onEnginesLoad', () => {
      it('should set engines & enginesMeta and set enginesLoading to false', () => {
        mount();
        EnginesLogic.actions.onEnginesLoad(MOCK_ENGINES_API_RESPONSE);

        expect(EnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          engines: [MOCK_ENGINE],
          enginesMeta: MOCK_META,
          enginesLoading: false,
          dataLoading: false,
        });
      });
    });

    describe('onMetaEnginesLoad', () => {
      it('should set engines & enginesMeta and set enginesLoading to false', () => {
        mount();
        EnginesLogic.actions.onMetaEnginesLoad(MOCK_ENGINES_API_RESPONSE);

        expect(EnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          metaEngines: [MOCK_ENGINE],
          metaEnginesMeta: MOCK_META,
          metaEnginesLoading: false,
        });
      });
    });

    describe('onEnginesPagination', () => {
      it('should set enginesMeta.page.current', () => {
        mount();
        EnginesLogic.actions.onEnginesPagination(2);

        expect(EnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          enginesMeta: {
            page: {
              ...DEFAULT_VALUES.enginesMeta.page,
              current: 2,
            },
          },
        });
      });
    });

    describe('onMetaEnginesPagination', () => {
      it('should set metaEnginesMeta.page.current', () => {
        mount();
        EnginesLogic.actions.onMetaEnginesPagination(99);

        expect(EnginesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          metaEnginesMeta: {
            page: {
              ...DEFAULT_VALUES.metaEnginesMeta.page,
              current: 99,
            },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('deleteEngine', () => {
      it('calls the engine API endpoint then onDeleteEngineSuccess', async () => {
        http.delete.mockReturnValueOnce(Promise.resolve({}));
        mount();
        jest.spyOn(EnginesLogic.actions, 'onDeleteEngineSuccess');

        EnginesLogic.actions.deleteEngine(MOCK_ENGINE);
        await nextTick();

        expect(http.delete).toHaveBeenCalledWith('/internal/app_search/engines/hello-world');
        expect(EnginesLogic.actions.onDeleteEngineSuccess).toHaveBeenCalledWith(MOCK_ENGINE);
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.delete.mockReturnValueOnce(Promise.reject());
        mount();

        EnginesLogic.actions.deleteEngine(MOCK_ENGINE);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });

    describe('loadEngines', () => {
      it('should call the engines API endpoint and set state based on the results', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_ENGINES_API_RESPONSE));
        mount();
        jest.spyOn(EnginesLogic.actions, 'onEnginesLoad');

        EnginesLogic.actions.loadEngines();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines', {
          query: {
            type: 'indexed',
            'page[current]': 1,
            'page[size]': 10,
          },
        });
        expect(EnginesLogic.actions.onEnginesLoad).toHaveBeenCalledWith(MOCK_ENGINES_API_RESPONSE);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        EnginesLogic.actions.loadEngines();
      });
    });

    describe('loadMetaEngines', () => {
      it('should call the engines API endpoint and set state based on the results', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_ENGINES_API_RESPONSE));
        mount();
        jest.spyOn(EnginesLogic.actions, 'onMetaEnginesLoad');

        EnginesLogic.actions.loadMetaEngines();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines', {
          query: {
            type: 'meta',
            'page[current]': 1,
            'page[size]': 10,
          },
        });
        expect(EnginesLogic.actions.onMetaEnginesLoad).toHaveBeenCalledWith(
          MOCK_ENGINES_API_RESPONSE
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        EnginesLogic.actions.loadMetaEngines();
      });
    });

    describe('onDeleteEngineSuccess', () => {
      beforeEach(() => {
        mount();
      });

      it('should call flashSuccessToast', () => {
        EnginesLogic.actions.onDeleteEngineSuccess(MOCK_ENGINE);

        expect(flashSuccessToast).toHaveBeenCalled();
      });

      it('should call loadEngines if engine.type === default', () => {
        jest.spyOn(EnginesLogic.actions, 'loadEngines');

        EnginesLogic.actions.onDeleteEngineSuccess({
          ...MOCK_ENGINE,
          type: 'default' as EngineTypes.default,
        });

        expect(EnginesLogic.actions.loadEngines).toHaveBeenCalled();
      });

      it('should call loadMetaEngines if engine.type === meta', () => {
        jest.spyOn(EnginesLogic.actions, 'loadMetaEngines');

        EnginesLogic.actions.onDeleteEngineSuccess({
          ...MOCK_ENGINE,
          type: 'meta' as EngineTypes.meta,
        });

        expect(EnginesLogic.actions.loadMetaEngines).toHaveBeenCalled();
      });
    });
  });

  describe('selectors', () => {
    describe('dataLoading', () => {
      it('returns true if enginesLoading is true and engines is empty', () => {
        mount({
          enginesLoading: true,
          engines: [],
        });
        expect(EnginesLogic.values.dataLoading).toEqual(true);
      });

      it('returns false if enginesLoading is true but engines exist', () => {
        // = the engines table is paginating, which has its own separate table loading indicator
        mount({
          enginesLoading: true,
          engines: [MOCK_ENGINE],
        });
        expect(EnginesLogic.values.dataLoading).toEqual(false);
      });

      it('returns false if engineLoading is false and engines is empty', () => {
        // = empty prompt state
        mount({
          enginesLoading: false,
          engines: [],
        });
        expect(EnginesLogic.values.dataLoading).toEqual(false);
      });

      // NOTE: dataLoading ignores metaEnginesLoading to prevent a race condition where
      // meta engines finish fetching before engines and flash an empty prompt state.
    });
  });
});
