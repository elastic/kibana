/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MetricsExplorerChartContextMenu, createNodeDetailLink, Props } from './chart_context_menu';
import { ReactWrapper, mount } from 'enzyme';
import {
  options,
  source,
  timeRange,
  chartOptions,
} from '../../../../utils/fixtures/metrics_explorer';
import { Capabilities } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';

const coreStartMock = coreMock.createStart();
const series = { id: 'exmaple-01', rows: [], columns: [] };
const uiCapabilities: Capabilities = {
  navLinks: { show: false },
  management: { fake: { show: false } },
  catalogue: { show: false },
  visualize: { show: true },
  infrastructure: { save: true },
};

const getTestSubject = (component: ReactWrapper, name: string) => {
  return component.find(`[data-test-subj="${name}"]`).hostNodes();
};

const mountComponentWithProviders = (props: Props): ReactWrapper => {
  return mount(
    <KibanaContextProvider services={{ ...coreStartMock }}>
      <MetricsExplorerChartContextMenu {...props} />
    </KibanaContextProvider>
  );
};

describe('MetricsExplorerChartContextMenu', () => {
  describe('component', () => {
    it('should just work', async () => {
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(1);
    });

    it('should not display View metrics for incompatible groupBy', async () => {
      const customOptions = { ...options, groupBy: 'system.network.name' };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(0);
    });

    it('should not display "Add Filter" without onFilter', async () => {
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should not display "Add Filter" without options.groupBy', async () => {
      const customOptions = { ...options, groupBy: void 0 };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should disable "Open in Visualize" when options.metrics is empty', async () => {
      const customOptions = { ...options, metrics: [] };
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options: customOptions,
        uiCapabilities,
        chartOptions,
      });
      component.find('button').simulate('click');
      expect(
        getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').prop('disabled')
      ).toBeTruthy();
    });

    it('should not display "Open in Visualize" when unavailble in uiCapabilities', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options,
        onFilter,
        uiCapabilities: customUICapabilities,
        chartOptions,
      });

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(0);
    });

    it('should not display anything when Visualize is disabled and there are no group bys.', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const customOptions = { ...options, groupBy: void 0 };
      const component = mountComponentWithProviders({
        timeRange,
        source,
        series,
        options: customOptions,
        onFilter,
        uiCapabilities: customUICapabilities,
        chartOptions,
      });
      expect(component.find('button').length).toBe(1);
    });
  });

  describe('helpers', () => {
    test('createNodeDetailLink()', () => {
      const fromDateStrig = '2019-01-01T11:00:00Z';
      const toDateStrig = '2019-01-01T12:00:00Z';
      const link = createNodeDetailLink('host', 'example-01', fromDateStrig, toDateStrig);
      expect(link).toStrictEqual({
        app: 'metrics',
        pathname: 'link-to/host-detail/example-01',
        search: { from: '1546340400000', to: '1546344000000' },
      });
    });
  });
});
