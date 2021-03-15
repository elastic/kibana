/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../../__mocks__';
import '../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { CurationLogic } from './';

describe('CurationLogic', () => {
  const { mount } = new LogicMounter(CurationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_CURATION_RESPONSE = {
    id: 'cur-123456789',
    last_updated: 'some timestamp',
    queries: ['some search'],
    promoted: [{ id: 'some-promoted-document' }],
    organic: [
      {
        id: { raw: 'some-organic-document', snippet: null },
        _meta: { id: 'some-organic-document', engine: 'some-engine' },
      },
    ],
    hidden: [{ id: 'some-hidden-document' }],
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    curation: {
      id: '',
      last_updated: '',
      queries: [],
      promoted: [],
      organic: [],
      hidden: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(CurationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onCurationLoad', () => {
      it('should set curation state & dataLoading to false', () => {
        mount();

        CurationLogic.actions.onCurationLoad(MOCK_CURATION_RESPONSE);

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          curation: MOCK_CURATION_RESPONSE,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadCuration', () => {
      it('should set dataLoading state', () => {
        mount({ dataLoading: false }, { curationId: 'cur-123456789' });

        CurationLogic.actions.loadCuration();

        expect(CurationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and set curation state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_CURATION_RESPONSE));
        mount({}, { curationId: 'cur-123456789' });
        jest.spyOn(CurationLogic.actions, 'onCurationLoad');

        CurationLogic.actions.loadCuration();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curations/cur-123456789'
        );
        expect(CurationLogic.actions.onCurationLoad).toHaveBeenCalledWith(MOCK_CURATION_RESPONSE);
      });

      it('handles errors/404s with a redirect to the Curations view', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount({}, { curationId: 'cur-404' });

        CurationLogic.actions.loadCuration();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error', { isQueued: true });
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations');
      });
    });

    describe('updateCuration', () => {
      beforeAll(() => jest.useFakeTimers());
      afterAll(() => jest.useRealTimers());

      it('should make a PUT API call with queries and promoted/hidden IDs to update', async () => {
        http.put.mockReturnValueOnce(Promise.resolve(MOCK_CURATION_RESPONSE));
        mount({}, { curationId: 'cur-123456789' });
        jest.spyOn(CurationLogic.actions, 'onCurationLoad');

        CurationLogic.actions.updateCuration();
        jest.runAllTimers();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curations/cur-123456789',
          {
            body: '{"queries":[],"query":"","promoted":[],"hidden":[]}', // Uses state currently in CurationLogic
          }
        );
        expect(CurationLogic.actions.onCurationLoad).toHaveBeenCalledWith(MOCK_CURATION_RESPONSE);
      });

      it('should allow passing a custom queries param', async () => {
        http.put.mockReturnValueOnce(Promise.resolve(MOCK_CURATION_RESPONSE));
        mount({}, { curationId: 'cur-123456789' });
        jest.spyOn(CurationLogic.actions, 'onCurationLoad');

        CurationLogic.actions.updateCuration({ queries: ['hello', 'world'] });
        jest.runAllTimers();
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/curations/cur-123456789',
          {
            body: '{"queries":["hello","world"],"query":"","promoted":[],"hidden":[]}',
          }
        );
        expect(CurationLogic.actions.onCurationLoad).toHaveBeenCalledWith(MOCK_CURATION_RESPONSE);
      });

      it('handles errors', async () => {
        http.put.mockReturnValueOnce(Promise.reject('error'));
        mount({}, { curationId: 'cur-123456789' });

        CurationLogic.actions.updateCuration();
        jest.runAllTimers();
        await nextTick();

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
