/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { AnnotationsPanel } from '.';
import { FramePublicAPI } from '../../../../types';
import { DatasourcePublicAPI } from '../../../..';
import { createMockFramePublicAPI } from '../../../../mocks';
import { State } from '../../types';
import { Position } from '@elastic/charts';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import moment from 'moment';
import { EventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { createMockDataViewsState } from '../../../../data_views_service/mocks';
import { createMockedIndexPattern } from '../../../../datasources/form_based/mocks';
import { act } from 'react-dom/test-utils';
import { EuiButtonGroup } from '@elastic/eui';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => {
    return 'QueryStringInput';
  },
}));

const customLineStaticAnnotation: EventAnnotationConfig = {
  id: 'ann1',
  type: 'manual',
  key: { type: 'point_in_time' as const, timestamp: '2022-03-18T08:25:00.000Z' },
  label: 'Event',
  icon: 'triangle' as const,
  color: 'red',
  lineStyle: 'dashed' as const,
  lineWidth: 3,
};

describe('AnnotationsPanel', () => {
  const datatableUtilities = createDatatableUtilitiesMock();
  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          layerType: LayerTypes.ANNOTATIONS,
          layerId: 'annotation',
          indexPatternId: 'indexPattern1',
          annotations: [customLineStaticAnnotation],
          ignoreGlobalFilters: true,
        },
      ],
    };
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI({ datasourceLayers: {} });
  });

  describe('Dimension Editor', () => {
    test('shows correct options for line annotations', () => {
      const state = testState();
      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-time"]').prop('selected')
      ).toEqual(moment('2022-03-18T08:25:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-fromTime"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-toTime"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiSwitch[data-test-subj="lns-xyAnnotation-rangeSwitch"]').prop('checked')
      ).toEqual(false);
      expect(
        component.find('EuiFieldText[data-test-subj="column-label-edit"]').prop('value')
      ).toEqual('Event');
      expect(
        component.find('EuiComboBox[data-test-subj="lns-icon-select"]').prop('selectedOptions')
      ).toEqual([{ label: 'Triangle', value: 'triangle' }]);
      expect(component.find('TextDecorationSetting').exists()).toBeTruthy();
      expect(component.find('LineStyleSettings').exists()).toBeTruthy();
      expect(
        component.find('EuiButtonGroup[data-test-subj="lns-xyAnnotation-fillStyle"]').exists()
      ).toBeFalsy();
    });
    test('shows correct options for range annotations', () => {
      const state = testState();
      state.layers[0] = {
        annotations: [
          {
            color: 'red',
            icon: 'triangle',
            id: 'ann1',
            type: 'manual',
            isHidden: undefined,
            key: {
              endTimestamp: '2022-03-21T10:49:00.000Z',
              timestamp: '2022-03-18T08:25:00.000Z',
              type: 'range',
            },
            label: 'Event range',
            lineStyle: 'dashed',
            lineWidth: 3,
          },
        ],
        layerId: 'annotation',
        layerType: 'annotations',
        indexPatternId: 'indexPattern1',
        ignoreGlobalFilters: true,
      };
      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={jest.fn()}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-fromTime"]').prop('selected')
      ).toEqual(moment('2022-03-18T08:25:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-toTime"]').prop('selected')
      ).toEqual(moment('2022-03-21T10:49:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-time"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiSwitch[data-test-subj="lns-xyAnnotation-rangeSwitch"]').prop('checked')
      ).toEqual(true);
      expect(
        component.find('EuiFieldText[data-test-subj="column-label-edit"]').prop('value')
      ).toEqual('Event range');
      expect(component.find('EuiComboBox[data-test-subj="lns-icon-select"]').exists()).toBeFalsy();
      expect(component.find('TextDecorationSetting').exists()).toBeFalsy();
      expect(component.find('LineStyleSettings').exists()).toBeFalsy();
      expect(component.find('[data-test-subj="lns-xyAnnotation-fillStyle"]').exists()).toBeTruthy();
    });

    test('calculates correct endTimstamp and transparent color when switching for range annotation and back', () => {
      const state = testState();
      const setState = jest.fn();
      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frame}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      component.find('button[data-test-subj="lns-xyAnnotation-rangeSwitch"]').simulate('click');

      expect(setState).toBeCalledWith({
        ...state,
        layers: [
          {
            annotations: [
              {
                color: '#FF00001A',
                id: 'ann1',
                isHidden: undefined,
                label: 'Event range',
                type: 'manual',
                key: {
                  endTimestamp: '2022-03-21T10:49:00.000Z',
                  timestamp: '2022-03-18T08:25:00.000Z',
                  type: 'range',
                },
              },
            ],
            indexPatternId: 'indexPattern1',
            layerId: 'annotation',
            layerType: 'annotations',
            ignoreGlobalFilters: true,
          },
        ],
      });
      component.find('button[data-test-subj="lns-xyAnnotation-rangeSwitch"]').simulate('click');
      expect(setState).toBeCalledWith({
        ...state,
        layers: [
          {
            annotations: [
              {
                color: '#FF0000',
                id: 'ann1',
                isHidden: undefined,
                key: {
                  timestamp: '2022-03-18T08:25:00.000Z',
                  type: 'point_in_time',
                },
                label: 'Event',
                type: 'manual',
              },
            ],
            indexPatternId: 'indexPattern1',
            layerId: 'annotation',
            layerType: 'annotations',
            ignoreGlobalFilters: true,
          },
        ],
      });
    });

    test('shows correct options for query based', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern();
      state.layers[0] = {
        annotations: [
          {
            color: 'red',
            icon: 'triangle',
            id: 'ann1',
            type: 'query',
            isHidden: undefined,
            timeField: 'timestamp',
            key: {
              type: 'point_in_time',
            },
            label: 'Query based event',
            lineStyle: 'dashed',
            lineWidth: 3,
            filter: { type: 'kibana_query', query: '', language: 'kuery' },
          },
        ],
        layerId: 'annotation',
        layerType: 'annotations',
        indexPatternId: indexPattern.id,
        ignoreGlobalFilters: true,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={jest.fn()}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      expect(
        component.find('[data-test-subj="lnsXY-annotation-query-based-field-picker"]').exists()
      ).toBeTruthy();
      expect(
        component.find('[data-test-subj="lnsXY-annotation-query-based-query-input"]').exists()
      ).toBeTruthy();

      // The provided indexPattern has 2 date fields
      expect(
        component
          .find('[data-test-subj="lnsXY-annotation-query-based-field-picker"]')
          .at(0)
          .prop('options')
      ).toHaveLength(2);
      // When in query mode a new "field" option is added to the previous 2 ones
      expect(
        component.find('[data-test-subj="lns-lineMarker-text-visibility"]').at(0).prop('options')
      ).toHaveLength(3);
      expect(
        component.find('[data-test-subj="lnsXY-annotation-tooltip-add_field"]').exists()
      ).toBeTruthy();
    });

    test('should prefill timeField with the default time field when switching to query based annotations', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern();
      state.layers[0] = {
        annotations: [customLineStaticAnnotation],
        layerId: 'annotation',
        layerType: 'annotations',
        ignoreGlobalFilters: true,
        indexPatternId: indexPattern.id,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const setState = jest.fn();

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [expect.objectContaining({ timeField: 'timestamp' })],
            }),
          ],
        })
      );
    });

    test('should avoid to retain specific manual configurations when switching to query based annotations', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern();
      state.layers[0] = {
        annotations: [customLineStaticAnnotation],
        layerId: 'annotation',
        layerType: 'annotations',
        ignoreGlobalFilters: true,
        indexPatternId: indexPattern.id,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const setState = jest.fn();

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [
                expect.objectContaining({
                  key: expect.not.objectContaining({ timestamp: expect.any('string') }),
                }),
              ],
            }),
          ],
        })
      );
    });

    test('should avoid to retain range manual configurations when switching to query based annotations', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern();
      state.layers[0] = {
        annotations: [
          {
            color: 'red',
            icon: 'triangle',
            id: 'ann1',
            type: 'manual',
            isHidden: undefined,
            key: {
              endTimestamp: '2022-03-21T10:49:00.000Z',
              timestamp: '2022-03-18T08:25:00.000Z',
              type: 'range',
            },
            label: 'Event range',
            lineStyle: 'dashed',
            lineWidth: 3,
          },
        ],
        layerId: 'annotation',
        layerType: 'annotations',
        ignoreGlobalFilters: true,
        indexPatternId: indexPattern.id,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const setState = jest.fn();

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [
                expect.objectContaining({ label: expect.not.stringContaining('Event range') }),
              ],
            }),
          ],
        })
      );
    });

    test('should set a default tiemstamp when switching from query based to manual annotations', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern();
      state.layers[0] = {
        annotations: [
          {
            color: 'red',
            icon: 'triangle',
            id: 'ann1',
            type: 'query',
            isHidden: undefined,
            timeField: 'timestamp',
            key: {
              type: 'point_in_time',
            },
            label: 'Query based event',
            lineStyle: 'dashed',
            lineWidth: 3,
            filter: { type: 'kibana_query', query: '', language: 'kuery' },
          },
        ],
        layerId: 'annotation',
        layerType: 'annotations',
        indexPatternId: indexPattern.id,
        ignoreGlobalFilters: true,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const setState = jest.fn();

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_manual');
      });
      component.update();

      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [
                expect.objectContaining({
                  key: { type: 'point_in_time', timestamp: expect.any(String) },
                }),
              ],
            }),
          ],
        })
      );

      // also check query specific props are not carried over
      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [expect.not.objectContaining({ timeField: 'timestamp' })],
            }),
          ],
        })
      );
    });

    test('should fallback to the first date field available in the dataView if not time-based', () => {
      const state = testState();
      const indexPattern = createMockedIndexPattern({ timeFieldName: '' });
      state.layers[0] = {
        annotations: [customLineStaticAnnotation],
        layerId: 'annotation',
        layerType: 'annotations',
        ignoreGlobalFilters: true,
        indexPatternId: indexPattern.id,
      };
      const frameMock = createMockFramePublicAPI({
        datasourceLayers: {},
        dataViews: createMockDataViewsState({
          indexPatterns: { [indexPattern.id]: indexPattern },
        }),
      });

      const setState = jest.fn();

      const component = mount(
        <AnnotationsPanel
          layerId={state.layers[0].layerId}
          frame={frameMock}
          setState={setState}
          accessor="ann1"
          groupId="left"
          state={state}
          datatableUtilities={datatableUtilities}
          formatFactory={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          panelRef={React.createRef()}
          addLayer={jest.fn()}
          removeLayer={jest.fn()}
          datasource={{} as DatasourcePublicAPI}
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [
            expect.objectContaining({
              annotations: [expect.objectContaining({ timeField: 'timestampLabel' })],
            }),
          ],
        })
      );
    });
  });
});
