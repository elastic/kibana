/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Settings } from '@elastic/charts';
import { shallow } from 'enzyme';
import { LensMultiTable } from '../types';
import { PieComponent } from './render_function';
import { PieExpressionArgs } from './types';
import { EmptyPlaceholder } from '../shared_components';

describe('PieVisualization component', () => {
  let getFormatSpy: jest.Mock;
  let convertSpy: jest.Mock;

  beforeEach(() => {
    convertSpy = jest.fn(x => x);
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
    };

    function getDefaultArgs() {
      return {
        data,
        formatFactory: getFormatSpy,
        isDarkMode: false,
        chartTheme: {},
        executeTriggerActions: jest.fn(),
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
