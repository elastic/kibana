/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { MetricConfigPanel } from './metric_config_panel';
import { DatasourcePublicAPI, DatasourceDimensionPanelProps, Operation } from '../types';
import { State } from './types';
import { NativeRendererProps } from '../native_renderer';

describe('MetricConfigPanel', () => {
  const dragDropContext = { dragging: undefined, setDragging: jest.fn() };

  function mockDatasource(): DatasourcePublicAPI {
    return {
      duplicateColumn: () => [],
      getOperationForColumnId: () => null,
      generateColumnId: () => 'TESTID',
      getTableSpec: () => [],
      moveColumnTo: () => {},
      removeColumnInTableSpec: () => [],
      renderDimensionPanel: () => {},
    };
  }

  function testState(): State {
    return {
      title: 'Test Metric',
      accessor: 'foo',
    };
  }

  function testSubj(component: ReactWrapper<unknown>, subj: string) {
    return component
      .find(`[data-test-subj="${subj}"]`)
      .first()
      .props();
  }

  test('allows editing the chart title', () => {
    const testSetTitle = (title: string) => {
      const setState = jest.fn();
      const component = mount(
        <MetricConfigPanel
          dragDropContext={dragDropContext}
          datasource={mockDatasource()}
          setState={setState}
          state={testState()}
        />
      );

      (testSubj(component, 'lnsMetric_title').onChange as Function)({ target: { value: title } });

      expect(setState).toHaveBeenCalledTimes(1);
      return setState.mock.calls[0][0];
    };

    expect(testSetTitle('Hoi')).toMatchObject({
      title: 'Hoi',
    });
    expect(testSetTitle('There!')).toMatchObject({
      title: 'There!',
    });
  });

  test('the value dimension panel only accepts singular numeric operations', () => {
    const datasource = {
      ...mockDatasource(),
      renderDimensionPanel: jest.fn(),
    };
    const state = testState();
    const component = mount(
      <MetricConfigPanel
        dragDropContext={dragDropContext}
        datasource={datasource}
        setState={jest.fn()}
        state={{ ...state, accessor: 'shazm' }}
      />
    );

    const panel = testSubj(component, 'lns_metric_valueDimensionPanel');
    const nativeProps = (panel as NativeRendererProps<DatasourceDimensionPanelProps>).nativeProps;
    const { columnId, filterOperations } = nativeProps;
    const exampleOperation: Operation = {
      dataType: 'number',
      id: 'foo',
      isBucketed: false,
      label: 'bar',
    };
    const ops: Operation[] = [
      { ...exampleOperation, dataType: 'number' },
      { ...exampleOperation, dataType: 'string' },
      { ...exampleOperation, dataType: 'boolean' },
      { ...exampleOperation, dataType: 'date' },
    ];
    expect(columnId).toEqual('shazm');
    expect(ops.filter(filterOperations)).toEqual([{ ...exampleOperation, dataType: 'number' }]);
  });
});
