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

  const DEFAULT_VALUES = {};

  it('has expected default values', () => {
    mount();
    expect(MetaEngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {});

  describe('listeners', () => {});
});
