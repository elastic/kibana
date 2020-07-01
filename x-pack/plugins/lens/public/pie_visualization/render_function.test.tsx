/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Partition, SeriesIdentifier, Settings } from '@elastic/charts';
import { shallow, mount } from 'enzyme';
import { LensMultiTable } from '../types';
import { PieComponent } from './render_function';
import { PieExpressionArgs } from './types';
import { EmptyPlaceholder } from '../shared_components';
import { createMockPaletteDefinition } from '../editor_frame_service/mocks';
import { ShapeTreeNode } from '@elastic/charts/dist/chart_types/partition_chart/layout/types/viewmodel_types';

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
          type: 'kibana_datatable',
          columns: [
            { id: 'a', name: 'a' },
            { id: 'b', name: 'b' },
            { id: 'c', name: 'c' },
          ],
          rows: [
            { a: 6, b: 2, c: 'I', d: 'Row 1' },
            { a: 1, b: 5, c: 'J', d: 'Row 2' },
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
      nestedLegend: false,
      percentDecimals: 3,
      hideLabels: false,
      palette: { getColor: createMockPaletteDefinition().getColor, type: 'lens_palette' },
    };

    function getDefaultArgs() {
      return {
        data,
        formatFactory: getFormatSpy,
        isDarkMode: false,
        chartTheme: {},
        onClickValue: jest.fn(),
      };
    }

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

    test('it calls the color function with the right series layers', () => {
      const component = shallow(
        <PieComponent
          args={args}
          {...getDefaultArgs()}
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

      component
        .find(Partition)
        .prop('layers')[1]
        .shape.fillColor({
          dataName: 'third',
          depth: 2,
          parent: {
            children: [
              ['first', {}],
              ['second', {}],
              ['third', {}],
            ],
            depth: 1,
            sortIndex: 0,
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
        } as ShapeTreeNode);

      expect(args.palette.getColor).toHaveBeenCalledWith([
        {
          name: 'css',
          maxDepth: 2,
          rankAtDepth: 1,
          totalSeries: 5,
          totalSeriesAtDepth: 3,
        },
        {
          name: 'third',
          maxDepth: 2,
          rankAtDepth: 2,
          totalSeries: 5,
          totalSeriesAtDepth: 3,
        },
      ]);
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
        [[{ groupByRollup: 6, value: 6 }], {} as SeriesIdentifier],
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
                    "name": "a",
                  },
                  Object {
                    "id": "b",
                    "name": "b",
                  },
                  Object {
                    "id": "c",
                    "name": "c",
                  },
                ],
                "rows": Array [
                  Object {
                    "a": 6,
                    "b": 2,
                    "c": "I",
                    "d": "Row 1",
                  },
                  Object {
                    "a": 1,
                    "b": 5,
                    "c": "J",
                    "d": "Row 2",
                  },
                ],
                "type": "kibana_datatable",
              },
              "value": 6,
            },
          ],
        }
      `);
    });

    test('it shows emptyPlaceholder for undefined grouped data', () => {
      const defaultData = getDefaultArgs().data;
      const emptyData: LensMultiTable = {
        ...defaultData,
        tables: {
          first: {
            ...defaultData.tables.first,
            rows: [
              { a: undefined, b: undefined, c: 'I', d: 'Row 1' },
              { a: undefined, b: undefined, c: 'J', d: 'Row 2' },
            ],
          },
        },
      };

      const component = shallow(
        <PieComponent args={args} {...getDefaultArgs()} data={emptyData} />
      );
      expect(component.find(EmptyPlaceholder).prop('icon')).toEqual('visPie');
    });
  });
});
