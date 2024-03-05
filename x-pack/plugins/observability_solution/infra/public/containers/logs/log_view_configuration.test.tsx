/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountHook } from '@kbn/test-jest-helpers';

import { useLogViewConfiguration } from './log_view_configuration';

describe('useLogViewConfiguration hook', () => {
  describe('textScale state', () => {
    it('has a default value', () => {
      const { getLastHookValue } = mountHook(() => useLogViewConfiguration().textScale);

      expect(getLastHookValue()).toEqual('medium');
    });

    it('can be updated', () => {
      const { act, getLastHookValue } = mountHook(() => useLogViewConfiguration());

      act(({ setTextScale }) => {
        setTextScale('small');
      });

      expect(getLastHookValue().textScale).toEqual('small');
    });
  });

  describe('textWrap state', () => {
    it('has a default value', () => {
      const { getLastHookValue } = mountHook(() => useLogViewConfiguration().textWrap);

      expect(getLastHookValue()).toEqual(true);
    });

    it('can be updated', () => {
      const { act, getLastHookValue } = mountHook(() => useLogViewConfiguration());

      act(({ setTextWrap }) => {
        setTextWrap(false);
      });

      expect(getLastHookValue().textWrap).toEqual(false);
    });
  });

  it('provides the available text scales', () => {
    const { getLastHookValue } = mountHook(() => useLogViewConfiguration().availableTextScales);

    expect(getLastHookValue()).toEqual(expect.any(Array));
    expect(getLastHookValue().length).toBeGreaterThan(0);
  });
});
