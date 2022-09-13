/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import React, { FormEvent } from 'react';
import { VisualizationDimensionEditorProps } from '../../types';
import { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import { MetricVisualizationState } from './visualization';
import { DimensionEditor } from './dimension_editor';
import { HTMLAttributes, mount, ReactWrapper, shallow } from 'enzyme';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { EuiButtonGroup, EuiColorPicker } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { LayoutDirection } from '@elastic/charts';
import { act } from 'react-dom/test-utils';
import { EuiColorPickerOutput } from '@elastic/eui/src/components/color_picker/color_picker';
import { createMockFramePublicAPI } from '../../mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { euiLightVars } from '@kbn/ui-theme';
import { DebouncedInput } from '../../shared_components/debounced_input';

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
  BREAKDOWN_EDITOR: '[data-test-subj="lnsMetricDimensionEditor_breakdown"]',
};

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
      frame: createMockFramePublicAPI(),
      setState: jest.fn(),
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      paletteService: chartPluginMock.createPaletteRegistry(),
    };
  });

  describe('primary metric dimension', () => {
    const accessor = 'primary-metric-col-id';

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

    const getHarnessWithState = (state: MetricVisualizationState) =>
      new Harness(
        mountWithIntl(
          <DimensionEditor
            {...props}
            state={{ ...state, metricAccessor: accessor }}
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
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
    });

    describe('static color controls', () => {
      it('is hidden when dynamic coloring is enabled', () => {
        const harnessWithPalette = getHarnessWithState({ ...fullState, palette });
        expect(harnessWithPalette.colorPicker.exists()).toBeFalsy();

        const harnessNoPalette = getHarnessWithState({ ...fullState, palette: undefined });
        expect(harnessNoPalette.colorPicker.exists()).toBeTruthy();
      });

      it('fills with default value', () => {
        const localHarness = getHarnessWithState({
          ...fullState,
          palette: undefined,
          color: undefined,
        });
        expect(localHarness.colorPicker.props().color).toBe(euiLightVars.euiColorPrimary);
      });

      it('sets color', () => {
        const localHarness = getHarnessWithState({
          ...fullState,
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
    const accessor = 'maximum-col-id';
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

      private get progressDirectionControl() {
        return this._wrapper.find(EuiButtonGroup);
      }

      public get currentState() {
        return this.rootComponent.props().state;
      }

      public setProgressDirection(direction: LayoutDirection) {
        this.progressDirectionControl.props().onChange(direction);
        this._wrapper.update();
      }

      public get progressDirectionDisabled() {
        return this.progressDirectionControl.find(EuiButtonGroup).props().isDisabled;
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
            state={{ ...fullState, maxAccessor: accessor }}
            accessor={accessor}
            setState={mockSetState}
          />
        )
      );
    });

    afterEach(() => mockSetState.mockClear());

    it('toggles progress direction', () => {
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

      public setCollapseFn(fn: string) {
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
});
