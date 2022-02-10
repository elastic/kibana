/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Partition,
  SeriesIdentifier,
  Settings,
  NodeColorAccessor,
  ShapeTreeNode,
  HierarchyOfArrays,
  Chart,
  PartialTheme,
} from '@elastic/charts';
import { shallow } from 'enzyme';
import type { LensMultiTable } from '../../common';
import type { PieExpressionArgs } from '../../common/expressions';
import { PieComponent } from './render_function';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder } from '../../../../../src/plugins/charts/public';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { LensIconChartDonut } from '../assets/chart_donut';

const chartsThemeService = chartPluginMock.createSetupContract().theme;

describe('PieVisualization component', () => {
  let getFormatSpy: jest.Mock;
  let convertSpy: jest.Mock;

  beforeEach(() => {
    convertSpy = jest.fn((x) => x);
    getFormatSpy = jest.fn();
    getFormatSpy.mockReturnValue({ convert: convertSpy });
  });

  describe('legend options', () => {
    const data: LensMultiTable = {
      type: 'lens_multitable',
      tables: {
        first: {
          type: 'datatable',
          columns: [
            { id: 'a', name: 'a', meta: { type: 'number' } },
            { id: 'b', name: 'b', meta: { type: 'string' } },
            { id: 'c', name: 'c', meta: { type: 'number' } },
          ],
          rows: [
            { a: 6, b: 'I', c: 2, d: 'Row 1' },
            { a: 1, b: 'J', c: 5, d: 'Row 2' },
          ],
        },
      },
    };

    const args: PieExpressionArgs = {
      shape: 'pie',
      groups: ['a', 'b'],
      metric: 'c',
      numberDisplay: 'hidden',
      categoryDisplay: 'default',
      legendDisplay: 'default',
      legendMaxLines: 1,
      truncateLegend: true,
      nestedLegend: false,
      percentDecimals: 3,
      hideLabels: false,
      palette: { name: 'mock', type: 'palette' },
    };

    function getDefaultArgs() {
      return {
        data,
        formatFactory: getFormatSpy,
        onClickValue: jest.fn(),
        chartsThemeService,
        paletteService: chartPluginMock.createPaletteRegistry(),
        renderMode: 'view' as const,
        syncColors: false,
      };
    }

    test('it shows legend on correct side', () => {
      const component = shallow(
        <PieComponent args={{ ...args, legendPosition: 'top' }} {...getDefaultArgs()} />
      );
      expect(component.find(Settings).prop('legendPosition')).toEqual('top');
    });

    test('it shows legend for 2 groups using default legendDisplay', () => {
      const component = shallow(<PieComponent args={args} {...getDefaultArgs()} />);
      expect(component.find(Settings).prop('showLegend')).toEqual(true);
    });

    test('it hides legend for 1 group using default legendDisplay', () => {
      const component = shallow(
        <PieComponent args={{ ...args, groups: ['a'] }} {...getDefaultArgs()} />
      );
      expect(component.find(Settings).prop('showLegend')).toEqual(false);
    });

    test('it hides legend that would show otherwise in preview mode', () => {
      const component = shallow(
        <PieComponent args={{ ...args, hideLabels: true }} {...getDefaultArgs()} />
      );
      expect(component.find(Settings).prop('showLegend')).toEqual(false);
    });

    test('it sets the correct lines per legend item', () => {
      const component = shallow(<PieComponent args={args} {...getDefaultArgs()} />);
      expect(component.find(Settings).prop<PartialTheme[]>('theme')[0]).toMatchObject({
        background: {
          color: undefined,
        },
        legend: {
          labelOptions: {
            maxLines: 1,
          },
        },
      });
    });

    test('it calls the color function with the right series layers', () => {
      const defaultArgs = getDefaultArgs();
      const component = shallow(
        <PieComponent
          args={args}
          {...defaultArgs}
          data={{
            ...data,
            tables: {
              first: {
                ...data.tables.first,
                rows: [
                  { a: 'empty', b: 'first', c: 1, d: 'Row 1' },
                  { a: 'css', b: 'first', c: 1, d: 'Row 1' },
                  { a: 'css', b: 'second', c: 1, d: 'Row 1' },
                  { a: 'css', b: 'third', c: 1, d: 'Row 1' },
                  { a: 'gz', b: 'first', c: 1, d: 'Row 1' },
                ],
              },
            },
          }}
        />
      );

      (component.find(Partition).prop('layers')![1].shape!.fillColor as NodeColorAccessor)(
        {
          dataName: 'third',
          depth: 2,
          parent: {
            children: [
              ['first', {}],
              ['second', {}],
              ['third', {}],
            ],
            depth: 1,
            value: 200,
            dataName: 'css',
            parent: {
              children: [
                ['empty', {}],
                ['css', {}],
                ['gz', {}],
              ],
              depth: 0,
              sortIndex: 0,
              value: 500,
            },
            sortIndex: 1,
          },
          value: 41,
          sortIndex: 2,
        } as unknown as ShapeTreeNode,
        0,
        [] as HierarchyOfArrays
      );

      expect(defaultArgs.paletteService.get('mock').getCategoricalColor).toHaveBeenCalledWith(
        [
          {
            name: 'css',
            rankAtDepth: 1,
            totalSeriesAtDepth: 3,
          },
          {
            name: 'third',
            rankAtDepth: 2,
            totalSeriesAtDepth: 3,
          },
        ],
        {
          maxDepth: 2,
          totalSeries: 5,
          syncColors: false,
          behindText: true,
        },
        undefined
      );
    });

    test('it hides legend with 2 groups for treemap', () => {
      const component = shallow(
        <PieComponent args={{ ...args, shape: 'treemap' }} {...getDefaultArgs()} />
      );
      expect(component.find(Settings).prop('showLegend')).toEqual(false);
    });

    test('it shows treemap legend only when forced on', () => {
      const component = shallow(
        <PieComponent
          args={{ ...args, legendDisplay: 'show', shape: 'treemap' }}
          {...getDefaultArgs()}
        />
      );
      expect(component.find(Settings).prop('showLegend')).toEqual(true);
    });

    test('it defaults to 1-level legend depth', () => {
      const component = shallow(<PieComponent args={args} {...getDefaultArgs()} />);
      expect(component.find(Settings).prop('legendMaxDepth')).toEqual(1);
    });

    test('it shows nested legend only when forced on', () => {
      const component = shallow(
        <PieComponent args={{ ...args, nestedLegend: true }} {...getDefaultArgs()} />
      );
      expect(component.find(Settings).prop('legendMaxDepth')).toBeUndefined();
    });

    test('it calls filter callback with the given context', () => {
      const defaultArgs = getDefaultArgs();
      const component = shallow(<PieComponent args={{ ...args }} {...defaultArgs} />);
      component.find(Settings).first().prop('onElementClick')!([
        [
          [
            {
              groupByRollup: 6,
              value: 6,
              depth: 1,
              path: [],
              sortIndex: 1,
              smAccessorValue: '',
            },
          ],
          {} as SeriesIdentifier,
        ],
      ]);

      expect(defaultArgs.onClickValue.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "column": 0,
              "row": 0,
              "table": Object {
                "columns": Array [
                  Object {
                    "id": "a",
                    "meta": Object {
                      "type": "number",
                    },
                    "name": "a",
                  },
                  Object {
                    "id": "b",
                    "meta": Object {
                      "type": "string",
                    },
                    "name": "b",
                  },
                  Object {
                    "id": "c",
                    "meta": Object {
                      "type": "number",
                    },
                    "name": "c",
                  },
                ],
                "rows": Array [
                  Object {
                    "a": 6,
                    "b": "I",
                    "c": 2,
                    "d": "Row 1",
                  },
                  Object {
                    "a": 1,
                    "b": "J",
                    "c": 5,
                    "d": "Row 2",
                  },
                ],
                "type": "datatable",
              },
              "value": 6,
            },
          ],
        }
      `);
    });

    test('does not set click listener and legend actions on non-interactive mode', () => {
      const defaultArgs = getDefaultArgs();
      const component = shallow(
        <PieComponent args={{ ...args }} {...defaultArgs} interactive={false} />
      );
      expect(component.find(Settings).first().prop('onElementClick')).toBeUndefined();
      expect(component.find(Settings).first().prop('legendAction')).toBeUndefined();
    });

    test('it renders the empty placeholder when metric contains only falsy data', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            rows: [
              { a: 0, b: 'I', c: 0, d: 'Row 1' },
              { a: 0, b: 'J', c: null, d: 'Row 2' },
            ],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );
      expect(component.find(VisualizationContainer)).toHaveLength(1);
      expect(component.find(EmptyPlaceholder)).toHaveLength(1);
    });

    test('it renders the chart when metric contains truthy data and buckets contain only falsy data', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            // a and b are buckets, c is a metric
            rows: [{ a: 0, b: undefined, c: 12 }],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );

      expect(component.find(VisualizationContainer)).toHaveLength(1);
      expect(component.find(EmptyPlaceholder)).toHaveLength(0);
      expect(component.find(Chart)).toHaveLength(1);
    });

    test('it shows emptyPlaceholder for undefined grouped data', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            rows: [
              { a: undefined, b: 'I', c: undefined, d: 'Row 1' },
              { a: undefined, b: 'J', c: undefined, d: 'Row 2' },
            ],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );
      expect(component.find(VisualizationContainer)).toHaveLength(1);
      expect(component.find(EmptyPlaceholder).prop('icon')).toEqual(LensIconChartDonut);
    });

    test('it should dynamically shrink the chart area to when some small slices are detected', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            rows: [
              { a: 60, b: 'I', c: 200, d: 'Row 1' },
              { a: 1, b: 'J', c: 0.1, d: 'Row 2' },
            ],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );
      expect(
        component.find(Settings).prop<PartialTheme[]>('theme')[0].partition?.outerSizeRatio
      ).toBeCloseTo(1 / 1.05);
    });

    test('it should bound the shrink the chart area to ~20% when some small slices are detected', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            rows: [
              { a: 60, b: 'I', c: 200, d: 'Row 1' },
              { a: 1, b: 'J', c: 0.1, d: 'Row 2' },
              { a: 1, b: 'K', c: 0.1, d: 'Row 3' },
              { a: 1, b: 'G', c: 0.1, d: 'Row 4' },
              { a: 1, b: 'H', c: 0.1, d: 'Row 5' },
            ],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );
      expect(
        component.find(Settings).prop<PartialTheme[]>('theme')[0].partition?.outerSizeRatio
      ).toBeCloseTo(1 / 1.2);
    });
  });
});
