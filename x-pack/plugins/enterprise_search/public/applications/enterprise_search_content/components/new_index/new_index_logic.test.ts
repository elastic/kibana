/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { DEFAULT_LANGUAGE } from './constants';
import { NewIndexLogic } from './new_index_logic';

const DEFAULT_VALUES = {
  searchEngines: [],
  searchEngineSelectOptions: [],
  rawName: '',
  name: '',
  language: DEFAULT_LANGUAGE,
  selectedSearchEngines: [],
};

describe('NewIndexLogic', () => {
  const { mount } = new LogicMounter(NewIndexLogic);

  it('has expected default values', () => {
    mount();
    expect(NewIndexLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setLanguage', () => {
      it('sets language to the provided value', () => {
        mount();
        NewIndexLogic.actions.setLanguage('English');
        expect(NewIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: 'English',
        });
      });
    });

    describe('setRawName', () => {
      beforeAll(() => {
        mount();
        NewIndexLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('sets rawName to provided value', () => {
        expect(NewIndexLogic.values.rawName).toEqual('Name__With#$&*%Special--Characters');
      });

      it('sets name to a sanitized value', () => {
        expect(NewIndexLogic.values.name).toEqual('name-with-special-characters');
      });
    });
  });
});
