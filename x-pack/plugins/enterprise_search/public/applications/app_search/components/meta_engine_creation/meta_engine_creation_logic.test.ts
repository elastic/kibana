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
    rawName: '',
  };

  it('has expected default values', () => {
    mount();
    expect(MetaEngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setRawName', () => {
      it('should set rawName to provided value', () => {
        mount();
        MetaEngineCreationLogic.actions.setRawName('Name__With#$&*%Special--Characters');
        expect(MetaEngineCreationLogic.values.rawName).toEqual(
          'Name__With#$&*%Special--Characters'
        );
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
  });

  describe('listeners', () => {});
});
