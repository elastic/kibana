/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { IndexExistsApiLogic } from '../../api/index/index_exists_api_logic';

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { flashIndexCreatedToast } from './new_index_created_toast';
import { NewSearchIndexLogic, NewSearchIndexValues } from './new_search_index_logic';

jest.mock('./new_index_created_toast', () => ({ flashIndexCreatedToast: jest.fn() }));
jest.mock('../../../shared/kibana/kibana_logic', () => ({
  KibanaLogic: { values: { productAccess: { hasAppSearchAccess: true } } },
}));

const DEFAULT_VALUES: NewSearchIndexValues = {
  data: undefined as any,
  fullIndexName: '',
  fullIndexNameExists: false,
  fullIndexNameIsValid: true,
  hasPrefix: false,
  language: null,
  languageSelectValue: UNIVERSAL_LANGUAGE_VALUE,
  rawName: '',
};

describe('NewSearchIndexLogic', () => {
  const { mount } = new LogicMounter(NewSearchIndexLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(NewSearchIndexLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setLanguageSelectValue', () => {
      it('sets language to the provided value', () => {
        NewSearchIndexLogic.actions.setLanguageSelectValue('en');
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: 'en',
          languageSelectValue: 'en',
        });
      });

      it('sets language to null when the universal language option is picked', () => {
        mount({
          language: 'en',
          languageSelectValue: 'en',
        });
        NewSearchIndexLogic.actions.setLanguageSelectValue(UNIVERSAL_LANGUAGE_VALUE);
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: null,
          languageSelectValue: UNIVERSAL_LANGUAGE_VALUE,
        });
      });
    });

    describe('setRawName', () => {
      it('sets correct values for valid index name', () => {
        NewSearchIndexLogic.actions.setRawName('rawname');
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          fullIndexName: 'rawname',
          fullIndexNameIsValid: true,
          rawName: 'rawname',
        });
      });

      it('sets correct values for invalid index name', () => {
        NewSearchIndexLogic.actions.setRawName('invalid/name');
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          fullIndexName: 'invalid/name',
          fullIndexNameIsValid: false,
          rawName: 'invalid/name',
        });
      });
      it('calls makeRequest on whether API exists with a 150ms debounce', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });
        NewSearchIndexLogic.actions.makeRequest = jest.fn();
        NewSearchIndexLogic.actions.setRawName('indexname');
        await nextTick();
        jest.advanceTimersByTime(150);
        await nextTick();
        expect(NewSearchIndexLogic.actions.makeRequest).toHaveBeenCalledWith({
          indexName: 'indexname',
        });
        jest.useRealTimers();
      });
    });
    describe('apiSuccess', () => {
      it('sets correct values for existing index', () => {
        NewSearchIndexLogic.actions.setRawName('indexname');
        IndexExistsApiLogic.actions.apiSuccess({ exists: true, indexName: 'indexname' });
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { exists: true, indexName: 'indexname' },
          fullIndexName: 'indexname',
          fullIndexNameExists: true,
          rawName: 'indexname',
        });
      });
    });
    describe('apiIndexCreated', () => {
      it('calls flash index created toast', () => {
        NewSearchIndexLogic.actions.apiIndexCreated({ indexName: 'indexName' });
        expect(flashIndexCreatedToast).toHaveBeenCalled();
      });
    });
    describe('connectorIndexCreated', () => {
      it('calls flash index created toast', () => {
        NewSearchIndexLogic.actions.connectorIndexCreated({
          id: 'connectorId',
          indexName: 'indexName',
        });
        expect(flashIndexCreatedToast).toHaveBeenCalled();
      });
    });
    describe('crawlerIndexCreated', () => {
      it('calls flash index created toast', () => {
        NewSearchIndexLogic.actions.crawlerIndexCreated({ created: 'indexName' });
        expect(flashIndexCreatedToast).toHaveBeenCalled();
      });
    });
  });
});
