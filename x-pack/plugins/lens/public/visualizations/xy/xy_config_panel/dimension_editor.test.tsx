/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { render, screen } from '@testing-library/react';
import { EuiButtonGroupProps, EuiButtonGroup } from '@elastic/eui';
import { DataDimensionEditor } from './dimension_editor';
import { FramePublicAPI, DatasourcePublicAPI } from '../../../types';
import { State, XYState, XYDataLayerConfig } from '../types';
import { Position } from '@elastic/charts';
import { createMockFramePublicAPI, createMockDatasource } from '../../../mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { EuiColorPicker } from '@elastic/eui';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { act } from 'react-dom/test-utils';

describe('XY Config panels', () => {
  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
    };
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
  });

  describe('Dimension Editor', () => {
    test('shows the correct axis side options when in horizontal mode', () => {
      const state = testState();
      const component = mount(
        <DataDimensionEditor
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={{
            ...state,
            layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' } as XYDataLayerConfig],
          }}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
          isDarkMode={false}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Bottom', 'Auto', 'Top']);
    });

    test('shows the default axis side options when not in horizontal mode', () => {
      const state = testState();
      const component = mount(
        <DataDimensionEditor
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
          isDarkMode={false}
        />
      );

      const options = component
        .find(EuiButtonGroup)
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ label }) => label)).toEqual(['Left', 'Auto', 'Right']);
    });

    test('sets the color of a dimension to the color from palette service if not set explicitly', () => {
      const state = {
        ...testState(),
        layers: [
          {
            seriesType: 'bar',
            layerType: LayerTypes.DATA,
            layerId: 'first',
            splitAccessor: undefined,
            xAccessor: 'foo',
            accessors: ['bar'],
          },
        ],
      } as XYState;
      const component = mount(
        <DataDimensionEditor
          layerId={state.layers[0].layerId}
          frame={{
            ...frame,
            activeData: {
              first: {
                type: 'datatable',
                columns: [],
                rows: [{ bar: 123 }],
              },
            },
          }}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
          isDarkMode={false}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('black');
    });

    test('uses the overwrite color if set', () => {
      const state = {
        ...testState(),
        layers: [
          {
            seriesType: 'bar',
            layerType: LayerTypes.DATA,
            layerId: 'first',
            splitAccessor: undefined,
            xAccessor: 'foo',
            accessors: ['bar'],
            yConfig: [{ forAccessor: 'bar', color: 'red' }],
          },
        ],
      } as XYState;

      const component = mount(
        <DataDimensionEditor
          layerId={state.layers[0].layerId}
          frame={{
            ...frame,
            activeData: {
              first: {
                type: 'datatable',
                columns: [],
                rows: [{ bar: 123 }],
              },
            },
          }}
          setState={jest.fn()}
          accessor="bar"
          groupId="left"
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
          isDarkMode={false}
        />
      );

      expect(component.find(EuiColorPicker).prop('color')).toEqual('red');
    });
    test.each<{ collapseFn?: string; shouldDisplay?: boolean }>([
      // should display color picker
      { shouldDisplay: true },
      // should not display color picker
      { collapseFn: 'sum', shouldDisplay: false },
    ])(
      'should only show color picker when collapseFn is defined for breakdown group',
      ({ collapseFn = undefined, shouldDisplay = true }) => {
        const state = {
          ...testState(),
          layers: [
            {
              collapseFn,
              seriesType: 'bar',
              layerType: LayerTypes.DATA,
              layerId: 'first',
              splitAccessor: 'breakdownAccessor',
              xAccessor: 'foo',
              accessors: ['bar'],
              yConfig: [{ forAccessor: 'bar', color: 'red' }],
            },
          ],
        } as XYState;

        render(
          <DataDimensionEditor
            layerId={state.layers[0].layerId}
            frame={{
              ...frame,
              activeData: {
                first: {
                  type: 'datatable',
                  columns: [],
                  rows: [{ bar: 123 }],
                },
              },
            }}
            setState={jest.fn()}
            accessor="breakdownAccessor"
            groupId={'breakdown'}
            state={state}
            formatFactory={jest.fn()}
            paletteService={chartPluginMock.createPaletteRegistry()}
            panelRef={React.createRef()}
            addLayer={jest.fn()}
            removeLayer={jest.fn()}
            datasource={{} as DatasourcePublicAPI}
            isDarkMode={false}
          />
        );
        const colorPickerUi = screen.queryByLabelText('Edit colors');

        if (shouldDisplay) {
          expect(colorPickerUi).toBeInTheDocument();
        } else {
          expect(colorPickerUi).not.toBeInTheDocument();
        }
      }
    );
    test('does not apply incorrect color', () => {
      jest.useFakeTimers();
      const setState = jest.fn();
      const state = {
        ...testState(),
        layers: [
          {
            seriesType: 'bar',
            layerType: LayerTypes.DATA,
            layerId: 'first',
            splitAccessor: undefined,
            xAccessor: 'foo',
            accessors: ['bar'],
            yConfig: [{ forAccessor: 'bar', color: 'red' }],
          },
        ],
      } as XYState;

      const component = mount(
        <DataDimensionEditor
          layerId={state.layers[0].layerId}
          frame={{
            ...frame,
            activeData: {
              first: {
                type: 'datatable',
                columns: [],
                rows: [{ bar: 123 }],
              },
            },
          }}
          setState={setState}
          accessor="bar"
          groupId="left"
          state={state}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
          isDarkMode={false}
        />
      );

      act(() => {
        component
          .find('input[data-test-subj="euiColorPickerAnchor indexPattern-dimension-colorPicker"]')
          .simulate('change', {
            target: { value: 'INCORRECT_COLOR' },
          });
      });
      component.update();
      jest.advanceTimersByTime(256);
      expect(component.find(EuiColorPicker).prop('color')).toEqual('INCORRECT_COLOR');
      expect(setState).not.toHaveBeenCalled();

      act(() => {
        component
          .find('input[data-test-subj="euiColorPickerAnchor indexPattern-dimension-colorPicker"]')
          .simulate('change', {
            target: { value: '666666' },
          });
      });
      component.update();
      jest.advanceTimersByTime(256);
      expect(component.find(EuiColorPicker).prop('color')).toEqual('666666');
      expect(setState).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
