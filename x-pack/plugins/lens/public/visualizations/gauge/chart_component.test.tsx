/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Goal } from '@elastic/charts';
import { shallowWithIntl } from '@kbn/test/jest';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import type { ColorStop, CustomPaletteParams, LensMultiTable } from '../../../common';
import { fieldFormatsServiceMock } from '../../../../../../src/plugins/field_formats/public/mocks';
import { GaugeExpressionArgs, GaugeTitleMode } from '../../../common/expressions/gauge_chart';
import { GaugeComponent, GaugeRenderProps } from './chart_component';
import { DatatableColumn, DatatableRow } from 'src/plugins/expressions/common';
import { VisualizationContainer } from '../../visualization_container';
import { PaletteOutput } from 'src/plugins/charts/common';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

const numberColumn = (id = 'metric-accessor'): DatatableColumn => ({
  id,
  name: 'Count of records',
  meta: {
    type: 'number',
    index: 'kibana_sample_data_ecommerce',
    params: {
      id: 'number',
    },
  },
});

const createData = (
  row: DatatableRow = { 'metric-accessor': 3, 'min-accessor': 0, 'max-accessor': 10 }
): LensMultiTable => {
  return {
    type: 'lens_multitable',
    tables: {
      layerId: {
        type: 'datatable',
        rows: [row],
        columns: Object.keys(row).map((key) => numberColumn(key)),
      },
    },
  };
};

const chartsThemeService = chartPluginMock.createSetupContract().theme;
const palettesRegistry = chartPluginMock.createPaletteRegistry();
const formatService = fieldFormatsServiceMock.createStartContract();
const args: GaugeExpressionArgs = {
  title: 'Gauge',
  description: 'vis description',
  metricAccessor: 'metric-accessor',
  minAccessor: '',
  maxAccessor: '',
  goalAccessor: '',
  shape: 'verticalBullet',
  colorMode: 'none',
  ticksPosition: 'auto',
  visTitleMode: 'auto',
};

describe('GaugeComponent', function () {
  let wrapperProps: GaugeRenderProps;

  beforeAll(() => {
    wrapperProps = {
      data: createData(),
      chartsThemeService,
      args,
      paletteService: palettesRegistry,
      formatFactory: formatService.deserialize,
    };
  });

  it('renders the chart', () => {
    const component = shallowWithIntl(<GaugeComponent {...wrapperProps} />);
    expect(component.find(Chart)).toMatchSnapshot();
  });

  it('shows empty placeholder when metricAccessor is not provided', async () => {
    const customProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metricAccessor: undefined,
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      },
      data: createData({ 'min-accessor': 0, 'max-accessor': 10 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.find(VisualizationContainer)).toHaveLength(1);
  });

  it('shows empty placeholder when minimum accessor equals maximum accessor', async () => {
    const customProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 0, 'min-accessor': 0, 'max-accessor': 0 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.find('EmptyPlaceholder')).toHaveLength(1);
  });

  describe('title and subtitle settings', () => {
    it('displays no title and no subtitle when no passed', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          visTitleMode: 'none' as GaugeTitleMode,
          subtitle: '',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('');
      expect(goal.prop('labelMinor')).toEqual('');
    });
    it('displays custom title and subtitle when passed', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          visTitleMode: 'custom' as GaugeTitleMode,
          visTitle: 'custom title',
          subtitle: 'custom subtitle',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('custom title   ');
      expect(goal.prop('labelMinor')).toEqual('custom subtitle  ');
    });
    it('displays auto title', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          visTitleMode: 'auto' as GaugeTitleMode,
          visTitle: '',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('Count of records   ');
    });
  });

  describe('ticks', () => {
    it('displays auto ticks', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 1.33, 2.67, 4]);
    });
    it('spreads auto ticks over the color domain if bigger than min/max domain', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'],
          gradient: false,
          stops: [20, 40, 60, 80, 100] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 4,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          palette,
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 33.33, 66.67, 100]);
    });
    it('passes number bands from color palette', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'],
          gradient: false,
          stops: [20, 60, 80, 100],
          range: 'number',
          rangeMin: 0,
          rangeMax: 120,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: 'palette',
          palette,
          ticksPosition: 'bands',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 20, 60, 80, 100]);
      expect(goal.prop('bands')).toEqual([0, 20, 60, 80, 100, 100]);
    });
    it('passes percent bands from color palette', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'],
          gradient: false,
          stops: [20, 60, 80],
          range: 'percent',
          rangeMin: 0,
          rangeMax: 4,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: 'palette',
          palette,
          ticksPosition: 'bands',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 0.8, 2.4, 3.2, 4]);
      expect(goal.prop('bands')).toEqual([0, 0.8, 2.4, 3.2, 4]);
    });
  });
});
