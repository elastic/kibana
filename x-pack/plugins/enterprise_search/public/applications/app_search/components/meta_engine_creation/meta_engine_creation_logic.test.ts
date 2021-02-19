/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';

import { MetaEngineCreationLogic } from './meta_engine_creation_logic';

describe('MetaEngineCreationLogic', () => {
  const { mount } = new LogicMounter(MetaEngineCreationLogic);

  const DEFAULT_VALUES = {
    indexedEngineNames: [],
    name: '',
    rawName: '',
    selectedIndexedEngineNames: [],
  };

  it('has expected default values', () => {
    mount();
    expect(MetaEngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setRawName', () => {
      beforeAll(() => {
        mount();
        MetaEngineCreationLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should set rawName to provided value', () => {
        expect(MetaEngineCreationLogic.values.rawName).toEqual(
          'Name__With#$&*%Special--Characters'
        );
      });

      it('should set name to a sanitized value', () => {
        expect(MetaEngineCreationLogic.values.name).toEqual('name-with-special-characters');
      });
    });

    describe('setIndexedEngineNames', () => {
      it('should set indexedEngineNames to provided value', () => {
        mount();
        MetaEngineCreationLogic.actions.setIndexedEngineNames(['first', 'middle', 'last']);
        expect(MetaEngineCreationLogic.values.indexedEngineNames).toEqual([
          'first',
          'middle',
          'last',
        ]);
      });
    });

    describe('setSelectedIndexedEngineNames', () => {
      it('should set selectedIndexedEngineNames to provided value', () => {
        mount();
        MetaEngineCreationLogic.actions.setSelectedIndexedEngineNames(['one', 'two', 'three']);
        expect(MetaEngineCreationLogic.values.selectedIndexedEngineNames).toEqual([
          'one',
          'two',
          'three',
        ]);
      });
    });
  });

  describe('listeners', () => {
    describe('fetchIndexedEngineNames', () => {
      it('should call flashApiErrors if the API throws an error', () => {
        throw Error('TODO');
      });

      it('should call setIndexedEngineNames with the current value.indexedEngineNames plus the results from the API request', () => {
        throw Error('TODO');
      });

      it('if there are remaining pages it should call fetchIndexedEngineNames recursively with an incremented page', () => {
        throw Error('TODO');
      });

      it('if there are no remaining pages it should end without calling recursively', () => {
        throw Error('TODO');
      });
    });

    describe('submitEngine', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('POSTS to /api/app_search/engines', () => {
        throw Error('TODO');
      });

      it('calls flashAPIErrors on API Error', async () => {
        throw Error('TODO');
      });
    });
  });
});
