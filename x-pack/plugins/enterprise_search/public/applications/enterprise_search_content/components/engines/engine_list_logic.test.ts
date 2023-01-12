/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';
import { EnterpriseSearchEngine } from '../../../../../common/types/engines';

import { FetchEnginesAPILogic } from '../../api/engines/fetch_engines_api_logic';

import { EnginesListLogic } from './engines_list_logic';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  data: undefined,
  results: [],
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  status: Status.IDLE,
};

// sample engines list

const results: EnterpriseSearchEngine[] = [
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-18', 'index-23'],
    name: 'engine-name-1',
    updated: '1999-12-31T23:59:59Z',
    // last_updated: '21 March 2021',
    // document_count: 18,
  },
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-180', 'index-230', 'index-8', 'index-2'],
    name: 'engine-name-2',
    updated: '1999-12-31T23:59:59Z',
    // last_updated: '10 Jul 2018',
    // document_count: 10,
  },
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-2', 'index-3'],
    name: 'engine-name-3',
    updated: '1999-12-31T23:59:59Z',
    // last_updated: '21 December 2022',
    // document_count: 8,
  },
];

describe('EnginesListLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchEnginesAPILogic);
  const { mount } = new LogicMounter(EnginesListLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        // test below code when pagination is ready
        // EnginesListLogic.actions.onPaginate(1);
        // expect(EnginesListLogic.values).toEqual({
        //   ...DEFAULT_VALUES,
        //   meta: {
        //     ...DEFAULT_META,
        //     from: 1,
        //   },
        //   parameters: {
        //     meta: {
        //       ...DEFAULT_META,
        //       from: 1,
        //     },
        //   },
        // });
      });
    });
  });
  describe('reducers', () => {
    describe('meta', () => {
      it('updates when apiSuccess', () => {
        const newPageMeta = {
          from: 2,
          size: 3,
          total: 6,
        };
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          meta: newPageMeta,
          results,
          // searchQuery: 'k',
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: newPageMeta,
            // searchQuery: 'k',
          },
          meta: newPageMeta,
          parameters: {
            meta: newPageMeta,
            // searchQuery: 'k',
          },
          results,
          status: Status.SUCCESS,
        });
      });
    });
  });
  describe('listeners', () => {
    it('call flashAPIErrors on apiError', () => {
      EnginesListLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });

    it('call makeRequest on fetchEngines', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      EnginesListLogic.actions.makeRequest = jest.fn();
      EnginesListLogic.actions.fetchEngines({ meta: DEFAULT_META });
      await nextTick();
      expect(EnginesListLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
      });
    });
  });
  describe('selectors', () => {
    describe('enginesList', () => {
      it('updates when apiSuccess', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          results,
          meta: DEFAULT_META,
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: DEFAULT_META,
          },
          meta: DEFAULT_META,
          parameters: {
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
