/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useTabs } from './use_tabs';

describe('useTabs', () => {
  describe('when we have container ids, pod names and host names', () => {
    it('returns all the tabs', () => {
      const params = {
        containerIds: ['apple'],
        podNames: ['orange'],
        hostNames: ['banana'],
        start: '2022-05-18T11:43:23.367Z',
        end: '2022-05-18T11:58:23.367Z',
      };
      const { result } = renderHook(() => useTabs(params));
      const tabs = [
        {
          id: 'containers',
          name: 'Containers',
          content: undefined,
        },
        {
          id: 'pods',
          name: 'Pods',
          content: undefined,
        },
        {
          id: 'hosts',
          name: 'Hosts',
          content: undefined,
        },
      ];

      expect(result.current).toStrictEqual(tabs);
    });
  });
  describe('when there are not container ids nor pod names', () => {
    it('returns host tab', () => {
      const params = {
        containerIds: [],
        podNames: [],
        hostNames: ['banana'],
        start: '2022-05-18T11:43:23.367Z',
        end: '2022-05-18T11:58:23.367Z',
      };
      const { result } = renderHook(() => useTabs(params));
      const tabs = [
        {
          id: 'hosts',
          name: 'Hosts',
          content: undefined,
        },
      ];

      expect(result.current).toStrictEqual(tabs);
    });
  });
  describe('when there are not container ids nor pod names nor host names', () => {
    it('returns host tab', () => {
      const params = {
        containerIds: [],
        podNames: [],
        hostNames: [],
        start: '2022-05-18T11:43:23.367Z',
        end: '2022-05-18T11:58:23.367Z',
      };
      const { result } = renderHook(() => useTabs(params));
      const tabs = [
        {
          id: 'hosts',
          name: 'Hosts',
          content: undefined,
        },
      ];

      expect(result.current).toStrictEqual(tabs);
    });
  });
});
