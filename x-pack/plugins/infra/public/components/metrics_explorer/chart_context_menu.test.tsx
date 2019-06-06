/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetricsExplorerChartContextMenu, createNodeDetailLink } from './chart_context_menu';
import { mountWithIntl } from '../../utils/enzyme_helpers';
import { options, source, timeRange } from '../../utils/fixtures/metrics_explorer';
import { InfraNodeType } from '../../graphql/types';
import DateMath from '@elastic/datemath';

const series = { id: 'exmaple-01', rows: [], columns: [] };

describe('MetricsExplorerChartContextMenu', () => {
  describe('component', () => {
    it('should just work', async () => {
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountWithIntl(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={options}
          onFilter={onFilter}
        />
      );

      component.find('button').simulate('click');
      const menuItems = component.find('.euiContextMenuItem__text');
      expect(menuItems.length).toBe(3);
      expect(menuItems.at(0).text()).toBe('Add filter');
      expect(menuItems.at(1).text()).toBe('Open in Visualize');
      expect(menuItems.at(2).text()).toBe('View metrics for host');
    });

    it('should not display View metrics for incompatible groupBy', async () => {
      const customOptions = { ...options, groupBy: 'system.network.name' };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountWithIntl(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          onFilter={onFilter}
        />
      );

      component.find('button').simulate('click');
      const menuItems = component.find('.euiContextMenuItem__text');
      expect(menuItems.length).toBe(2);
      expect(menuItems.at(0).text()).toBe('Add filter');
      expect(menuItems.at(1).text()).toBe('Open in Visualize');
    });

    it('should not display "Add Filter" without onFilter', async () => {
      const component = mountWithIntl(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={options}
        />
      );

      component.find('button').simulate('click');
      const menuItems = component.find('.euiContextMenuItem__text');
      expect(menuItems.length).toBe(2);
      expect(menuItems.at(0).text()).toBe('Open in Visualize');
      expect(menuItems.at(1).text()).toBe('View metrics for host');
    });

    it('should not display "Add Filter" without options.groupBy', async () => {
      const customOptions = { ...options, groupBy: void 0 };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mountWithIntl(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          onFilter={onFilter}
        />
      );

      component.find('button').simulate('click');
      const menuItems = component.find('.euiContextMenuItem__text');
      expect(menuItems.length).toBe(1);
      expect(menuItems.at(0).text()).toBe('Open in Visualize');
    });

    it('should disable "Open in Visualize" when options.metrics is empty', async () => {
      const customOptions = { ...options, metrics: [] };
      const component = mountWithIntl(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
        />
      );

      component.find('button').simulate('click');
      const menuItems = component.find('button.euiContextMenuItem');
      expect(menuItems.length).toBe(1);
      expect(menuItems.at(0).prop('disabled')).toBeTruthy();
    });
  });

  describe('helpers', () => {
    test('createNodeDetailLink()', () => {
      const to = DateMath.parse('now', { roundUp: true });
      const from = DateMath.parse('now-1h');
      if (!to || !from) {
        throw new Error('This should never happen');
      }
      const link = createNodeDetailLink(InfraNodeType.host, 'example-01', 'now-1h', 'now');
      expect(link).toBe(
        `#/link-to/host-detail/example-01?to=${to.valueOf()}&from=${from.valueOf()}`
      );
    });
  });
});
