/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { DEFAULT_LANGUAGE } from './constants';
import { NewSearchIndexLogic } from './new_search_index_logic';

const DEFAULT_VALUES = {
  rawName: '',
  name: '',
  language: DEFAULT_LANGUAGE,
};

describe('NewSearchIndexLogic', () => {
  const { mount } = new LogicMounter(NewSearchIndexLogic);

  it('has expected default values', () => {
    mount();
    expect(NewSearchIndexLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setLanguage', () => {
      it('sets language to the provided value', () => {
        mount();
        NewSearchIndexLogic.actions.setLanguage('English');
        expect(NewSearchIndexLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: 'English',
        });
      });
    });

    describe('setRawName', () => {
      beforeAll(() => {
        mount();
        NewSearchIndexLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('sets rawName to provided value', () => {
        expect(NewSearchIndexLogic.values.rawName).toEqual('Name__With#$&*%Special--Characters');
      });

      it('sets name to a sanitized value', () => {
        expect(NewSearchIndexLogic.values.name).toEqual('name-with-special-characters');
      });
    });
  });
});
