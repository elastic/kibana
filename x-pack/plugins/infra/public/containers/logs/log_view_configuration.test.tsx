/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountHook } from 'test_utils/enzyme_helpers';

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

  describe('intervalSize state', () => {
    it('has a default value', () => {
      const { getLastHookValue } = mountHook(() => useLogViewConfiguration().intervalSize);

      expect(getLastHookValue()).toEqual(86400000);
    });

    it('can be updated', () => {
      const { act, getLastHookValue } = mountHook(() => useLogViewConfiguration());

      act(({ setIntervalSize }) => {
        setIntervalSize(90000000);
      });

      expect(getLastHookValue().intervalSize).toEqual(90000000);
    });
  });

  it('provides the available text scales', () => {
    const { getLastHookValue } = mountHook(() => useLogViewConfiguration().availableTextScales);

    expect(getLastHookValue()).toEqual(expect.any(Array));
    expect(getLastHookValue().length).toBeGreaterThan(0);
  });

  it('provides the available interval sizes', () => {
    const { getLastHookValue } = mountHook(() => useLogViewConfiguration().availableIntervalSizes);

    expect(getLastHookValue()).toEqual(expect.any(Array));
    expect(getLastHookValue().length).toBeGreaterThan(0);
  });
});
