/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import React, { FormEvent } from 'react';
import { OperationDescriptor, VisualizationDimensionEditorProps } from '../../types';
import { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import { MetricVisualizationState } from './visualization';
import {
  DimensionEditor,
  DimensionEditorAdditionalSection,
  SupportingVisType,
} from './dimension_editor';
import { HTMLAttributes, mount, ReactWrapper, shallow } from 'enzyme';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { EuiButtonGroup, EuiColorPicker, PropsOf } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { LayoutDirection } from '@elastic/charts';
import { act } from 'react-dom/test-utils';
import { EuiColorPickerOutput } from '@elastic/eui/src/components/color_picker/color_picker';
import { createMockFramePublicAPI } from '../../mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { euiLightVars } from '@kbn/ui-theme';
import { DebouncedInput } from '../../shared_components/debounced_input';
import { DatasourcePublicAPI } from '../..';
import { CollapseFunction } from '../../../common/expressions';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const SELECTORS = {
  PRIMARY_METRIC_EDITOR: '[data-test-subj="lnsMetricDimensionEditor_primary_metric"]',
  SECONDARY_METRIC_EDITOR: '[data-test-subj="lnsMetricDimensionEditor_secondary_metric"]',
  MAX_EDITOR: '[data-test-subj="lnsMetricDimensionEditor_maximum"]',
  BREAKDOWN_EDITOR: '[data-test-subj="lnsMetricDimensionEditor_breakdown"]',
};

// see https://github.com/facebook/jest/issues/4402#issuecomment-534516219
const expectCalledBefore = (mock1: jest.Mock, mock2: jest.Mock) =>
  expect(mock1.mock.invocationCallOrder[0]).toBeLessThan(mock2.mock.invocationCallOrder[0]);

describe('dimension editor', () => {
  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: 'subtitle',
    secondaryPrefix: 'extra-text',
    progressDirection: 'vertical',
    maxCols: 5,
    color: 'static-color',
    palette,
    showBar: true,
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-accessor',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  };

  let props: VisualizationDimensionEditorProps<MetricVisualizationState> & {
    paletteService: PaletteRegistry;
  };

  beforeEach(() => {
    props = {
      layerId: 'first',
      groupId: 'some-group',
      accessor: 'some-accessor',
      state: fullState,
      datasource: {
        hasDefaultTimeField: jest.fn(),
        getOperationForColumnId: jest.fn(() => ({
          hasReducedTimeRange: false,
        })),
      } as unknown as DatasourcePublicAPI,
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
      frame: createMockFramePublicAPI(),
      setState: jest.fn(),
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      paletteService: chartPluginMock.createPaletteRegistry(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('primary metric dimension', () => {
    const accessor = 'primary-metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };

    beforeEach(() => {
      props.frame.activeData = {
        first: {
          type: 'datatable',
          columns: [
            {
              id: accessor,
              name: 'foo',
              meta: {
                type: 'number',
              },
            },
          ],
          rows: [],
        },
      };
    });

    class Harness {
      public _wrapper;

      constructor(
        wrapper: ReactWrapper<HTMLAttributes, unknown, React.Component<{}, {}, unknown>>
      ) {
        this._wrapper = wrapper;
      }

      private get rootComponent() {
        return this._wrapper.find(DimensionEditor);
      }

      public get colorPicker() {
        return this._wrapper.find(EuiColorPicker);
      }

      public get currentState() {
        return this.rootComponent.props().state;
      }

      public setColor(color: string) {
        act(() => {
          this.colorPicker.props().onChange!(color, {} as EuiColorPickerOutput);
        });
      }
    }

    const mockSetState = jest.fn();

    const getHarnessWithState = (state: MetricVisualizationState, datasource = props.datasource) =>
      new Harness(
        mountWithIntl(
          <DimensionEditor
            {...props}
            datasource={datasource}
            state={state}
            setState={mockSetState}
            accessor={accessor}
          />
        )
      );

    it('renders when the accessor matches', () => {
      const component = shallow(
        <DimensionEditor
          {...props}
          state={{ ...fullState, metricAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.MAX_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
    });

    describe('static color controls', () => {
      it('is hidden when dynamic coloring is enabled', () => {
        const harnessWithPalette = getHarnessWithState({ ...metricAccessorState, palette });
        expect(harnessWithPalette.colorPicker.exists()).toBeFalsy();

        const harnessNoPalette = getHarnessWithState({
          ...metricAccessorState,
          palette: undefined,
        });
        expect(harnessNoPalette.colorPicker.exists()).toBeTruthy();
      });

      it('fills with default value', () => {
        const localHarness = getHarnessWithState({
          ...metricAccessorState,
          palette: undefined,
          color: undefined,
        });
        expect(localHarness.colorPicker.props().color).toBe(euiLightVars.euiColorPrimary);
      });

      it('sets color', () => {
        const localHarness = getHarnessWithState({
          ...metricAccessorState,
          palette: undefined,
          color: 'some-color',
        });

        const newColor = 'new-color';
        localHarness.setColor(newColor + 1);
        localHarness.setColor(newColor + 2);
        localHarness.setColor(newColor + 3);
        localHarness.setColor('');
        expect(mockSetState).toHaveBeenCalledTimes(4);
        expect(mockSetState.mock.calls.map((args) => args[0].color)).toMatchInlineSnapshot(`
          Array [
            "new-color1",
            "new-color2",
            "new-color3",
            undefined,
          ]
        `);
      });
    });
  });

  describe('secondary metric dimension', () => {
    const accessor = 'secondary-metric-col-id';

    beforeEach(() => {
      props.frame.activeData = {
        first: {
          type: 'datatable',
          columns: [
            {
              id: accessor,
              name: 'foo',
              meta: {
                type: 'number',
              },
            },
          ],
          rows: [],
        },
      };
    });

    it('renders when the accessor matches', () => {
      const component = shallow(
        <DimensionEditor
          {...props}
          state={{ ...fullState, secondaryMetricAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.MAX_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeFalsy();
    });

    describe('metric prefix', () => {
      const NONE_PREFIX = '';
      const AUTO_PREFIX = undefined;

      it('activates the correct buttons', () => {
        const setState = jest.fn();
        const localState = {
          ...fullState,
          secondaryPrefix: AUTO_PREFIX,
          secondaryMetricAccessor: accessor,
        };
        const component = mount(
          <DimensionEditor {...props} state={localState} setState={setState} accessor={accessor} />
        );

        expect(component.find(EuiButtonGroup).props().idSelected).toContain('auto');

        component.setProps({
          state: {
            ...localState,
            secondaryPrefix: NONE_PREFIX,
          },
        });

        expect(component.find(EuiButtonGroup).props().idSelected).toContain('none');

        component.setProps({
          state: {
            ...localState,
            secondaryPrefix: 'some custom prefix',
          },
        });

        expect(component.find(EuiButtonGroup).props().idSelected).toContain('custom');
      });

      it('clicking a button sets the prefix value', () => {
        const setState = jest.fn();
        const localState = {
          ...fullState,
          secondaryPrefix: AUTO_PREFIX,
          secondaryMetricAccessor: accessor,
        };
        const component = mount(
          <DimensionEditor {...props} state={localState} setState={setState} accessor={accessor} />
        );

        const newVal = 'Metric explanation';

        component.find(EuiButtonGroup).props().onChange('some-id', newVal);

        expect(setState).toHaveBeenCalledWith({ ...localState, secondaryPrefix: newVal });
      });

      it('sets a custom prefix value', () => {
        const setState = jest.fn();
        const localState = {
          ...fullState,
          secondaryPrefix: 'foo',
          secondaryMetricAccessor: accessor,
        };
        const component = mount(
          <DimensionEditor {...props} state={localState} setState={setState} accessor={accessor} />
        );

        const buttonGroup = component.find(EuiButtonGroup);

        // make sure that if the user was to select the "custom" option, they would get the default value
        expect(buttonGroup.props().options[1].value).toBe('foo');

        const newVal = 'bar';

        component.find(DebouncedInput).props().onChange(newVal);

        expect(setState).toHaveBeenCalledWith({ ...localState, secondaryPrefix: newVal });
      });
    });
  });

  describe('maximum dimension', () => {
    const accessor = 'max-col-id';

    it('renders when the accessor matches', () => {
      const component = shallow(
        <DimensionEditor
          {...props}
          state={{ ...fullState, maxAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.MAX_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
    });
  });

  describe('breakdown-by dimension', () => {
    const accessor = 'breakdown-col-id';

    class Harness {
      public _wrapper;

      constructor(
        wrapper: ReactWrapper<HTMLAttributes, unknown, React.Component<{}, {}, unknown>>
      ) {
        this._wrapper = wrapper;
      }

      private get collapseSetting() {
        return this._wrapper.find(CollapseSetting);
      }

      public get currentCollapseFn() {
        return this.collapseSetting.props().value;
      }

      public setCollapseFn(fn: CollapseFunction) {
        return this.collapseSetting.props().onChange(fn);
      }

      public setMaxCols(max: number) {
        act(() => {
          this._wrapper.find('EuiFieldNumber[data-test-subj="lnsMetric_max_cols"]').props()
            .onChange!({
            target: { value: String(max) },
          } as unknown as FormEvent);
        });
      }
    }

    let harness: Harness;
    const mockSetState = jest.fn();

    beforeEach(() => {
      harness = new Harness(
        mountWithIntl(
          <DimensionEditor
            {...props}
            state={{ ...fullState, breakdownByAccessor: accessor }}
            accessor={accessor}
            setState={mockSetState}
          />
        )
      );
    });

    afterEach(() => mockSetState.mockClear());

    it('renders when the accessor matches', () => {
      const component = shallow(
        <DimensionEditor
          {...props}
          state={{ ...fullState, breakdownByAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.MAX_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeFalsy();
    });

    it('supports setting a collapse function', () => {
      expect(harness.currentCollapseFn).toBe(fullState.collapseFn);
      const newCollapseFunc = 'min';
      harness.setCollapseFn(newCollapseFunc);
      expect(mockSetState).toHaveBeenCalledWith({ ...fullState, collapseFn: newCollapseFunc });
    });

    it('sets max columns', () => {
      harness.setMaxCols(1);
      harness.setMaxCols(2);
      harness.setMaxCols(3);
      expect(mockSetState).toHaveBeenCalledTimes(3);
      expect(mockSetState.mock.calls.map((args) => args[0].maxCols)).toMatchInlineSnapshot(`
          Array [
            1,
            2,
            3,
          ]
        `);
    });
  });

  describe('additional section', () => {
    const accessor = 'primary-metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };

    class Harness {
      public _wrapper;

      constructor(
        wrapper: ReactWrapper<HTMLAttributes, unknown, React.Component<{}, {}, unknown>>
      ) {
        this._wrapper = wrapper;
      }

      private get rootComponent() {
        return this._wrapper.find(DimensionEditorAdditionalSection);
      }

      public get currentState() {
        return this.rootComponent.props().state;
      }

      private get supportingVisButtonGroup() {
        return this._wrapper.find(
          'EuiButtonGroup[data-test-subj="lnsMetric_supporting_visualization_buttons"]'
        ) as unknown as ReactWrapper<PropsOf<typeof EuiButtonGroup>>;
      }

      public get currentSupportingVis() {
        return this.supportingVisButtonGroup
          .props()
          .idSelected?.split('--')[1] as SupportingVisType;
      }

      public isDisabled(type: SupportingVisType) {
        return this.supportingVisButtonGroup.props().options.find(({ id }) => id.includes(type))
          ?.isDisabled;
      }

      public setSupportingVis(type: SupportingVisType) {
        this.supportingVisButtonGroup.props().onChange(`some-id--${type}`);
      }

      private get progressDirectionControl() {
        return this._wrapper.find(
          'EuiButtonGroup[data-test-subj="lnsMetric_progress_direction_buttons"]'
        ) as unknown as ReactWrapper<PropsOf<typeof EuiButtonGroup>>;
      }

      public get progressDirectionShowing() {
        return this.progressDirectionControl.exists();
      }

      public setProgressDirection(direction: LayoutDirection) {
        this.progressDirectionControl.props().onChange(direction);
        this._wrapper.update();
      }
    }

    const mockSetState = jest.fn();

    const getHarnessWithState = (state: MetricVisualizationState, datasource = props.datasource) =>
      new Harness(
        mountWithIntl(
          <DimensionEditorAdditionalSection
            {...props}
            datasource={datasource}
            state={state}
            setState={mockSetState}
            accessor={accessor}
          />
        )
      );

    it.each([
      { name: 'secondary metric', accessor: metricAccessorState.secondaryMetricAccessor },
      { name: 'max', accessor: metricAccessorState.maxAccessor },
      { name: 'break down by', accessor: metricAccessorState.breakdownByAccessor },
    ])('doesnt show for the following dimension: %s', ({ accessor: testAccessor }) => {
      expect(
        shallow(
          <DimensionEditorAdditionalSection
            {...props}
            state={metricAccessorState}
            setState={mockSetState}
            accessor={testAccessor}
          />
        ).isEmptyRender()
      ).toBeTruthy();
    });

    describe('supporting visualizations', () => {
      const stateWOTrend = {
        ...metricAccessorState,
        trendlineLayerId: undefined,
      };

      describe('reflecting visualization state', () => {
        it('should select the correct button', () => {
          expect(
            getHarnessWithState({ ...stateWOTrend, showBar: false, maxAccessor: undefined })
              .currentSupportingVis
          ).toBe<SupportingVisType>('none');
          expect(
            getHarnessWithState({ ...stateWOTrend, showBar: true }).currentSupportingVis
          ).toBe<SupportingVisType>('bar');
          expect(
            getHarnessWithState(metricAccessorState).currentSupportingVis
          ).toBe<SupportingVisType>('trendline');
        });

        it('should disable bar when no max dimension', () => {
          expect(
            getHarnessWithState({
              ...stateWOTrend,
              showBar: false,
              maxAccessor: 'something',
            }).isDisabled('bar')
          ).toBeFalsy();
          expect(
            getHarnessWithState({
              ...stateWOTrend,
              showBar: false,
              maxAccessor: undefined,
            }).isDisabled('bar')
          ).toBeTruthy();
        });

        it('should disable trendline when no default time field', () => {
          expect(
            getHarnessWithState(stateWOTrend, {
              hasDefaultTimeField: () => false,
              getOperationForColumnId: (id) => ({} as OperationDescriptor),
            } as DatasourcePublicAPI).isDisabled('trendline')
          ).toBeTruthy();
          expect(
            getHarnessWithState(stateWOTrend, {
              hasDefaultTimeField: () => true,
              getOperationForColumnId: (id) => ({} as OperationDescriptor),
            } as DatasourcePublicAPI).isDisabled('trendline')
          ).toBeFalsy();
        });
      });

      it('should disable trendline when a metric dimension has a reduced time range', () => {
        expect(
          getHarnessWithState(stateWOTrend, {
            hasDefaultTimeField: () => true,
            getOperationForColumnId: (id) =>
              ({
                hasReducedTimeRange: id === stateWOTrend.metricAccessor,
              } as OperationDescriptor),
          } as DatasourcePublicAPI).isDisabled('trendline')
        ).toBeTruthy();
        expect(
          getHarnessWithState(stateWOTrend, {
            hasDefaultTimeField: () => true,
            getOperationForColumnId: (id) =>
              ({
                hasReducedTimeRange: id === stateWOTrend.secondaryMetricAccessor,
              } as OperationDescriptor),
          } as DatasourcePublicAPI).isDisabled('trendline')
        ).toBeTruthy();
      });

      describe('responding to buttons', () => {
        it('enables trendline', () => {
          getHarnessWithState(stateWOTrend).setSupportingVis('trendline');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.addLayer).toHaveBeenCalledWith('metricTrendline');

          expectCalledBefore(mockSetState, props.addLayer as jest.Mock);
        });

        it('enables bar', () => {
          getHarnessWithState(metricAccessorState).setSupportingVis('bar');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: true });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });

        it('selects none from bar', () => {
          getHarnessWithState(stateWOTrend).setSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.removeLayer).not.toHaveBeenCalled();
        });

        it('selects none from trendline', () => {
          getHarnessWithState(metricAccessorState).setSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: false });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });
      });

      describe('progress bar direction controls', () => {
        it('hides direction controls if bar not showing', () => {
          expect(
            getHarnessWithState({ ...stateWOTrend, showBar: false }).progressDirectionShowing
          ).toBeFalsy();
        });

        it('toggles progress direction', () => {
          const harness = getHarnessWithState(metricAccessorState);

          expect(harness.progressDirectionShowing).toBeTruthy();
          expect(harness.currentState.progressDirection).toBe('vertical');

          harness.setProgressDirection('horizontal');
          harness.setProgressDirection('vertical');
          harness.setProgressDirection('horizontal');

          expect(mockSetState).toHaveBeenCalledTimes(3);
          expect(mockSetState.mock.calls.map((args) => args[0].progressDirection))
            .toMatchInlineSnapshot(`
              Array [
                "horizontal",
                "vertical",
                "horizontal",
              ]
            `);
        });
      });
    });
  });
});
