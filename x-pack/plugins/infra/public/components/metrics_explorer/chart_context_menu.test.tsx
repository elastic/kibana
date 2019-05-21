/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import { mountWithIntl } from '../../utils/enzyme_helpers';
import { options, source, timeRange } from '../../utils/fixtures/metrics_explorer';
import { UICapabilities } from 'ui/capabilities';

const series = { id: 'exmaple-01', rows: [], columns: [] };
const uiCapabilities: UICapabilities = {
  navLinks: { show: false },
  management: { fake: { show: false } },
  catalogue: { show: false },
  visualize: { show: true },
};

describe('MetricsExplorerChartContextMenu', () => {
  it('should just work', async () => {
    const onFilter = jest.fn().mockImplementation((query: string) => void 0);
    const component = mountWithIntl(
      <MetricsExplorerChartContextMenu
        timeRange={timeRange}
        source={source}
        series={series}
        options={options}
        onFilter={onFilter}
        uiCapabilities={uiCapabilities}
      />
    );

    component.find('button').simulate('click');
    const menuItems = component.find('.euiContextMenuItem__text');
    expect(menuItems.length).toBe(2);
    expect(menuItems.at(0).text()).toBe('Add Filter');
    expect(menuItems.at(1).text()).toBe('Open in Visualize');
  });

  it('should not display "Add Filter" without onFilter', async () => {
    const component = mountWithIntl(
      <MetricsExplorerChartContextMenu
        timeRange={timeRange}
        source={source}
        series={series}
        options={options}
        uiCapabilities={uiCapabilities}
      />
    );

    component.find('button').simulate('click');
    const menuItems = component.find('.euiContextMenuItem__text');
    expect(menuItems.length).toBe(1);
    expect(menuItems.at(0).text()).toBe('Open in Visualize');
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
        uiCapabilities={uiCapabilities}
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
        uiCapabilities={uiCapabilities}
      />
    );

    component.find('button').simulate('click');
    const menuItems = component.find('button.euiContextMenuItem');
    expect(menuItems.length).toBe(1);
    expect(menuItems.at(0).prop('disabled')).toBeTruthy();
  });

  it('should not display "Open in Visualize" when unavailble in uiCapabilities', async () => {
    const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
    const onFilter = jest.fn().mockImplementation((query: string) => void 0);
    const component = mountWithIntl(
      <MetricsExplorerChartContextMenu
        timeRange={timeRange}
        source={source}
        series={series}
        options={options}
        onFilter={onFilter}
        uiCapabilities={customUICapabilities}
      />
    );

    component.find('button').simulate('click');
    const menuItems = component.find('button.euiContextMenuItem');
    expect(menuItems.length).toBe(1);
    expect(menuItems.at(0).text()).toBe('Add Filter');
  });

  it('should not display anything', async () => {
    const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
    const onFilter = jest.fn().mockImplementation((query: string) => void 0);
    const customOptions = { ...options, groupBy: void 0 };
    const component = mountWithIntl(
      <MetricsExplorerChartContextMenu
        timeRange={timeRange}
        source={source}
        series={series}
        options={customOptions}
        onFilter={onFilter}
        uiCapabilities={customUICapabilities}
      />
    );
    expect(component.find('button').length).toBe(0);
  });
});
