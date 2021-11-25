/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Settings } from '@elastic/charts';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import type { LensMultiTable } from '../../common';
import { fieldFormatsServiceMock } from '../../../../../../src/plugins/field_formats/public/mocks';
import { EmptyPlaceholder } from '../../shared_components';
import { GaugeExpressionArgs, GaugeExpressionProps } from '../../../common/expressions/gauge_chart';
import { GaugeComponent, GaugeRenderProps } from './chart_component';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

const chartsThemeService = chartPluginMock.createSetupContract().theme;
const palettesRegistry = chartPluginMock.createPaletteRegistry();
const formatService = fieldFormatsServiceMock.createStartContract();
const args: GaugeExpressionProps = {
  percentageMode: false,
  legend: {
    isVisible: true,
    position: 'top',
    type: 'heatmap_legend',
  },
  gridConfig: {
    isCellLabelVisible: true,
    isYAxisLabelVisible: true,
    isXAxisLabelVisible: true,
    type: 'heatmap_grid',
  },
  palette: {
    type: 'palette',
    name: '',
    params: {
      colors: ['rgb(0, 0, 0)', 'rgb(112, 38, 231)'],
      stops: [0, 150],
      gradient: false,
      rangeMin: 0,
      rangeMax: 150,
      range: 'number',
    },
  },
  showTooltip: true,
  highlightInHover: false,
  xAccessor: 'col-1-2',
  valueAccessor: 'col-0-1',
};
const data: LensMultiTable = {
  type: 'datatable',
  rows: [
    { 'col-0-1': 0, 'col-1-2': 'a' },
    { 'col-0-1': 148, 'col-1-2': 'b' },
  ],
  columns: [
    { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
    { id: 'col-1-2', name: 'Dest', meta: { type: 'string' } },
  ],
};

const mockState = new Map();
const uiState = {
  get: jest
    .fn()
    .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
  set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
  emit: jest.fn(),
  setSilent: jest.fn(),
} as any;

describe('GaugeComponent', function () {
  let wrapperProps: GaugeRenderProps;

  beforeAll(() => {
    wrapperProps = {
      data,
      chartsThemeService,
      args,
      uiState,
      onClickValue: jest.fn(),
      onSelectRange: jest.fn(),
      paletteService: palettesRegistry,
      formatFactory: formatService.deserialize,
    };
  });

  it('renders the chart', () => {
    const component = shallowWithIntl(<GaugeComponent {...wrapperProps} />);
    expect(component.find(Settings).prop('legendPosition')).toEqual('top');
  });

  it('shows empty placeholder when metricAccessor is not provided', async () => {
    const component = mountWithIntl(<GaugeComponent {...wrapperProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'vislibToggleLegend').length).toBe(1);
    });
  });

  it('shows empty placeholder when minimum accessor equals maximum accessor', async () => {
    const newProps = { ...wrapperProps, uiState: undefined } as unknown as GaugeExpressionProps;
    const component = mountWithIntl(<GaugeComponent {...newProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'vislibToggleLegend').length).toBe(0);
    });
  });

  it('rounds to 0,0.0 for range smaller than 10', async () => {
    const component = mountWithIntl(<GaugeComponent {...wrapperProps} />);
    await act(async () => {
      expect(component.find(Settings).prop('legendColorPicker')).toBeDefined();
    });
  });

  describe('title and subtitle settings', () => {});

  describe('colors ranges', () => {});
  describe('ticks', () => {});
});
