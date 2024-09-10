/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import faker from 'faker';
import {
  createMockDatasource,
  createMockFramePublicAPI,
  createMockVisualization,
  mockDatasourceStates,
  mockStoreDeps,
} from '../../../mocks';
import { LayerHeader } from './layer_header';
import { renderWithReduxStore } from '../../../mocks';
import userEvent from '@testing-library/user-event';
import { LensAppState } from '../../../state_management';

describe('LayerHeader', () => {
  const renderLayerSettings = (
    propsOverrides = {},
    { preloadedStateOverrides }: { preloadedStateOverrides: Partial<LensAppState> } = {
      preloadedStateOverrides: {},
    }
  ) => {
    const datasourceMap = {
      testDatasource: createMockDatasource(),
      testDatasource2: createMockDatasource('testDatasource2'),
    };
    const visualizationMap = {
      testVis: createMockVisualization(),
      testVis2: {
        ...createMockVisualization('testVis2'),
        getCustomLayerHeader: () => <div>CustomLayerHeader</div>,
      },
      testVis3: {
        ...createMockVisualization('testVis3'),
        visualizationTypes: ['subvisC1', 'subvisC2', 'subvisC3'].map((id) => ({
          icon: 'empty',
          id,
          label: faker.lorem.word(),
          description: faker.lorem.sentence(),
          sortPriority: 1,
        })),
      },
      hiddenVis: { ...createMockVisualization('hiddenVis'), hideFromChartSwitch: () => true },
    };
    const rtlRender = renderWithReduxStore(
      <LayerHeader
        datasourceMap={datasourceMap}
        visualizationMap={visualizationMap}
        activeVisualizationId="testVis"
        layerConfigProps={{
          layerId: 'myLayer',
          state: {},
          frame: createMockFramePublicAPI(),
          setState: jest.fn(),
          onChangeIndexPattern: jest.fn(),
        }}
        {...propsOverrides}
      />,
      {},
      {
        storeDeps: mockStoreDeps({ datasourceMap, visualizationMap }),
        preloadedState: {
          visualization: {
            activeId: 'visA',
            state: 'state from a',
          },
          datasourceStates: mockDatasourceStates(),
          activeDatasourceId: 'testDatasource',
          ...preloadedStateOverrides,
        },
      }
    );
    const openChartSwitch = () => {
      userEvent.click(screen.getByTestId('lnsChartSwitchPopover'));
    };
    const queryChartOptionByLabel = (label: string) => {
      return screen.queryByRole('presentation', { name: label });
    };
    const getAllChartSwitchOptions = () => {
      return screen
        .queryAllByRole('option')
        .map((el) => (el as HTMLInputElement).getAttribute('value'));
    };
    return {
      ...rtlRender,
      openChartSwitch,
      queryChartOptionByLabel,
      getAllChartSwitchOptions,
    };
  };

  it('should use custom renderer if passed', () => {
    renderLayerSettings({ activeVisualizationId: 'testVis2' });
    expect(screen.getByText('CustomLayerHeader')).toBeInTheDocument();
    expect(screen.queryByTestId('lnsChartSwitchPopover')).not.toBeInTheDocument();
  });

  it('should not display visualization if hideFromChartSwitch returns true', () => {
    const { openChartSwitch, queryChartOptionByLabel, getAllChartSwitchOptions } =
      renderLayerSettings();
    openChartSwitch();
    expect(queryChartOptionByLabel('hiddenVis')).not.toBeInTheDocument();
    expect(getAllChartSwitchOptions()).toEqual([
      'testVis:testVis',
      'testVis2:testVis2',
      'testVis3:subvisC1',
      'testVis3:subvisC2',
      'testVis3:subvisC3',
    ]);
  });

  it('should render chart switch if custom layer header was not passed', () => {
    renderLayerSettings();
    expect(screen.getByTestId('lnsChartSwitchPopover')).toBeInTheDocument();
  });

  it('should render static header if only one visualization is available', () => {
    renderLayerSettings({
      visualizationMap: {
        testVis: {
          ...createMockVisualization(),
          getDescription: () => ({ label: 'myVisualizationType', icon: 'empty' }),
          visualizationTypes: ['testVis'],
        },
      },
    });
    expect(screen.getByText('myVisualizationType')).toBeInTheDocument();
    expect(screen.queryByTestId('lnsChartSwitchPopover')).not.toBeInTheDocument();
  });

  it('Discover path: should only allow switch to subtypes when onlyAllowSwitchToSubtypes is true', () => {
    const { openChartSwitch, getAllChartSwitchOptions } = renderLayerSettings({
      onlyAllowSwitchToSubtypes: true,
      activeVisualizationId: 'testVis3',
    });
    openChartSwitch();
    expect(getAllChartSwitchOptions()).toEqual([
      'testVis3:subvisC1',
      'testVis3:subvisC2',
      'testVis3:subvisC3',
    ]);
  });
});
