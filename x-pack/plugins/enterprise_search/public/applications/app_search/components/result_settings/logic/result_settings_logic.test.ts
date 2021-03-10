/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__';

import { ResultSettingsLogic } from '.';

describe('ResultSettingsLogic', () => {
  const { mount } = new LogicMounter(ResultSettingsLogic);

  const DEFAULT_VALUES = {
    nonTextResultFields: {},
    resultFields: {},
    serverResultFields: {},
    textResultFields: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ResultSettingsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('clearAllFields', () => {
      it('should remove all settings that have been set for each field', () => {
        mount({
          nonTextResultFields: {
            foo: { raw: false, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: false, snippetFallback: true },
          },
          textResultFields: {
            qux: { raw: false, snippet: false, snippetFallback: false },
            quux: { raw: true, snippet: false, snippetFallback: true },
          },
          resultFields: {
            quuz: { raw: false, snippet: false, snippetFallback: false },
            corge: { raw: true, snippet: false, snippetFallback: true },
          },
          serverResultFields: {
            grault: { raw: { size: 5 } },
            garply: { raw: true },
          },
        });

        ResultSettingsLogic.actions.clearAllFields();

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          nonTextResultFields: {
            foo: {},
            bar: {},
          },
          textResultFields: {
            qux: {},
            quux: {},
          },
          resultFields: {
            quuz: {},
            corge: {},
          },
          serverResultFields: {
            grault: {},
            garply: {},
          },
        });
      });
    });
  });
});
