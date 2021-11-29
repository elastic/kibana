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
import type { ColorStop, LensMultiTable } from '../../../common';
import { fieldFormatsServiceMock } from '../../../../../../src/plugins/field_formats/public/mocks';
import { GaugeExpressionArgs, GaugeTitleMode } from '../../../common/expressions/gauge_chart';
import { GaugeComponent, GaugeRenderProps } from './chart_component';
import { DatatableColumn, DatatableRow } from 'src/plugins/expressions/common';
import { VisualizationContainer } from '../../visualization_container';

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
  it('shows empty placeholder when minimum accessor value is greater maximum accessor value', async () => {
    const customProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 0, 'min-accessor': 0, 'max-accessor': -10 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.find('EmptyPlaceholder')).toHaveLength(1);
  });
  it('when metric value is bigger than max, it takes maximum value', () => {
    const customProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        ticksPosition: 'bands',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 12, 'min-accessor': 0, 'max-accessor': 10 }),
    } as GaugeRenderProps;
    const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
    expect(goal.prop('actual')).toEqual(10);
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

  describe('ticks and color bands', () => {
    it('displays auto ticks', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 3.33, 6.67, 10]);
    });
    it('spreads auto ticks over the color domain if bigger than min/max domain', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [10, 20, 30] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 20,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
          palette,
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 6.67, 13.33, 20]);
    });
    it('sets proper color bands and ticks on color bands for values smaller than maximum', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [1, 2, 3] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 4,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
          palette,
          ticksPosition: 'bands',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 1, 2, 10]);
      expect(goal.prop('bands')).toEqual([0, 1, 2, 10]);
    });
    it('doesnt set ticks for values differing <10%', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [1, 1.5, 3] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 10,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
          palette,
          ticksPosition: 'bands',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 1, 10]);
      expect(goal.prop('bands')).toEqual([0, 1, 1.5, 10]);
    });
    it('sets proper color bands and ticks on color bands for values greater than maximum', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [10, 20, 30, 31] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 30,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
          palette,
          ticksPosition: 'bands',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 10, 20, 30]);
      expect(goal.prop('bands')).toEqual([0, 10, 20, 30]);
    });
    it('passes number bands from color palette with no stops defined', () => {
      const palette = {
        type: 'palette' as const,
        name: 'gray',
        params: {
          colors: ['#aaa', '#bbb'],
          gradient: false,
          stops: [],
          range: 'number',
          rangeMin: 0,
          rangeMax: 10,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: 'palette',
          palette,
          ticksPosition: 'bands',
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 5, 10]);
      expect(goal.prop('bands')).toEqual([0, 5, 10]);
    });
    it('passes percent bands from color palette', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [20, 60, 80],
          range: 'percent',
          rangeMin: 0,
          rangeMax: 10,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: 'palette',
          palette,
          ticksPosition: 'bands',
          metricAccessor: 'metric-accessor',
          minAccessor: 'min-accessor',
          maxAccessor: 'max-accessor',
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 2, 6, 8]);
      expect(goal.prop('bands')).toEqual([0, 2, 6, 8]);
    });
  });
});
