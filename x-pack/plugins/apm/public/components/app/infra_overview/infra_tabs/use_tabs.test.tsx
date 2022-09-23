/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useTabs } from './use_tabs';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { shallow } from 'enzyme';

const KibanaReactContext = createKibanaReactContext({
  infra: {
    HostMetricsTable: () => 'Host metrics table',
    ContainerMetricsTable: () => 'Container metrics table',
    PodMetricsTable: () => 'Pods metrics table',
  },
} as unknown as Partial<CoreStart>);
function wrapper({ children }: { children: ReactNode }) {
  return <KibanaReactContext.Provider>{children}</KibanaReactContext.Provider>;
}

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
      const { result } = renderHook(() => useTabs(params), { wrapper });

      const tabs = [
        {
          id: 'containers',
          name: 'Containers',
          content: '<EuiSpacer />Container metrics table',
        },
        {
          id: 'pods',
          name: 'Pods',
          content: '<EuiSpacer />Pods metrics table',
        },
        {
          id: 'hosts',
          name: 'Hosts',
          content: '<EuiSpacer />Host metrics table',
        },
      ];
      tabs.forEach(({ id, name, content }, index) => {
        const currentResult = result.current[index];
        const component = shallow(<div>{currentResult.content}</div>);
        expect(currentResult.id).toBe(id);
        expect(currentResult.name).toBe(name);
        expect(component.text()).toBe(content);
      });
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
      const { result } = renderHook(() => useTabs(params), { wrapper });
      const tabs = [
        {
          id: 'hosts',
          name: 'Hosts',
          content: '<EuiSpacer />Host metrics table',
        },
      ];

      tabs.forEach(({ id, name, content }, index) => {
        const currentResult = result.current[index];
        const component = shallow(<div>{currentResult.content}</div>);
        expect(currentResult.id).toBe(id);
        expect(currentResult.name).toBe(name);
        expect(component.text()).toBe(content);
      });
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

      const { result } = renderHook(() => useTabs(params), { wrapper });
      const tabs = [
        {
          id: 'hosts',
          name: 'Hosts',
          content: '<EuiSpacer />Host metrics table',
        },
      ];

      tabs.forEach(({ id, name, content }, index) => {
        const currentResult = result.current[index];
        const component = shallow(<div>{currentResult.content}</div>);
        expect(currentResult.id).toBe(id);
        expect(currentResult.name).toBe(name);
        expect(component.text()).toBe(content);
      });
    });
  });
});
