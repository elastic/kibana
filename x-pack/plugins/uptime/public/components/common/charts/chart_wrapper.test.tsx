/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { mount } from 'enzyme';
import { nextTick } from '@kbn/test-jest-helpers';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ChartWrapper } from './chart_wrapper';
import { SnapshotHeading } from '../../overview/snapshot/snapshot_heading';
import { DonutChart } from './donut_chart';
const SNAPSHOT_CHART_HEIGHT = 144;
describe('ChartWrapper component', () => {
  it('renders the component with loading false', () => {
    const component = shallowWithIntl(
      <ChartWrapper loading={false}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders the component with loading true', () => {
    const component = shallowWithIntl(
      <ChartWrapper loading={true}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );
    expect(component).toMatchSnapshot();
  });

  it('mounts the component with loading true or false', async () => {
    const component = mount(
      <ChartWrapper loading={true}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );

    let loadingChart = component.find(`.euiLoadingChart`);
    expect(loadingChart.length).toBe(1);

    component.setProps({
      loading: false,
    });
    await nextTick();
    component.update();

    loadingChart = component.find(`.euiLoadingChart`);
    expect(loadingChart.length).toBe(0);
  });

  it('mounts the component with chart when loading true or false', async () => {
    const component = mount(
      <ChartWrapper loading={true}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );

    let donutChart = component.find(DonutChart);
    expect(donutChart.length).toBe(1);

    component.setProps({
      loading: false,
    });
    await nextTick();
    component.update();

    donutChart = component.find(DonutChart);
    expect(donutChart.length).toBe(1);
  });
});
