/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Toolbar } from './toolbar';
import { getDefaultColor, MetricVisualizationState } from './visualization';
import { createMockFramePublicAPI } from '../../mocks';
import { HTMLAttributes, ReactWrapper } from 'enzyme';
import { EuiButtonGroup, EuiColorPicker, EuiFieldText } from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import { ToolbarButton } from '@kbn/kibana-react-plugin/public';
import { act } from 'react-dom/test-utils';
import { EuiColorPickerOutput } from '@elastic/eui/src/components/color_picker/color_picker';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

describe('metric toolbar', () => {
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

  const frame = createMockFramePublicAPI();

  class Harness {
    public _wrapper;

    constructor(wrapper: ReactWrapper<HTMLAttributes, unknown, React.Component<{}, {}, unknown>>) {
      this._wrapper = wrapper;
    }

    private get toolbarComponent() {
      return this._wrapper.find(Toolbar);
    }

    private get subtitleField() {
      return this._wrapper.find(EuiFieldText);
    }

    private get progressDirectionControl() {
      return this._wrapper.find(EuiButtonGroup);
    }

    public get colorPicker() {
      return this._wrapper.find(EuiColorPicker);
    }

    public get currentState() {
      return this.toolbarComponent.props().state;
    }

    public toggleOpenTextOptions() {
      const toolbarButtons = this._wrapper.find(ToolbarButton);
      toolbarButtons.at(0).simulate('click');
    }

    public setSubtitle(subtitle: string) {
      act(() => {
        this.subtitleField.props().onChange!({
          target: { value: subtitle },
        } as unknown as ChangeEvent<HTMLInputElement>);
      });
    }

    public toggleOpenDisplayOptions() {
      const toolbarButtons = this._wrapper.find(ToolbarButton);
      toolbarButtons.at(1).simulate('click');
    }

    public setProgressDirection(direction: LayoutDirection) {
      this.progressDirectionControl.props().onChange(direction);
      this._wrapper.update();
    }

    public get progressDirectionDisabled() {
      return this.progressDirectionControl.find(EuiButtonGroup).props().isDisabled;
    }

    public setMaxCols(max: number) {
      this._wrapper.find('EuiFieldNumber[data-test-subj="lnsMetric_max_cols"]').props().onChange!({
        target: { value: String(max) },
      } as unknown as FormEvent);
    }

    public setColor(color: string) {
      act(() => {
        this.colorPicker.props().onChange!(color, {} as EuiColorPickerOutput);
      });
    }

    public get colorDisabled() {
      return this.colorPicker.props().disabled;
    }
  }

  let harness: Harness;
  const mockSetState = jest.fn();

  const getHarnessWithState = (state: MetricVisualizationState) =>
    new Harness(mountWithIntl(<Toolbar state={state} setState={mockSetState} frame={frame} />));

  beforeEach(() => {
    harness = getHarnessWithState(fullState);
  });

  afterEach(() => mockSetState.mockClear());

  describe('text options', () => {
    it('sets a subtitle', () => {
      harness.toggleOpenTextOptions();

      const newSubtitle = 'new subtitle hey';
      harness.setSubtitle(newSubtitle + ' 1');
      harness.setSubtitle(newSubtitle + ' 2');
      harness.setSubtitle(newSubtitle + ' 3');
      expect(mockSetState.mock.calls.map(([state]) => state.subtitle)).toMatchInlineSnapshot(`
        Array [
          "new subtitle hey 1",
          "new subtitle hey 2",
          "new subtitle hey 3",
        ]
      `);
    });
  });

  describe('display options', () => {
    beforeEach(() => {
      harness.toggleOpenDisplayOptions();
    });

    it('disables progress direction toggle when no maximum', () => {
      const localHarness = getHarnessWithState({ ...fullState, maxAccessor: undefined });
      localHarness.toggleOpenDisplayOptions();
      expect(localHarness.progressDirectionDisabled).toBe(true);
    });

    it('toggles progress direction', () => {
      expect(harness.progressDirectionDisabled).toBeFalsy();
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

    describe('color picker', () => {
      it('is disabled when color-by-value is enabled', () => {
        const harnessWithPalette = getHarnessWithState({ ...fullState, palette });
        harnessWithPalette.toggleOpenDisplayOptions();
        expect(harnessWithPalette.colorDisabled).toBeTruthy();

        const harnessNoPalette = getHarnessWithState({ ...fullState, palette: undefined });
        harnessNoPalette.toggleOpenDisplayOptions();
        expect(harnessNoPalette.colorDisabled).toBeFalsy();
      });

      it('fills placeholder with default value', () => {
        const localHarness = getHarnessWithState({ ...fullState, color: undefined });
        localHarness.toggleOpenDisplayOptions();
        expect(localHarness.colorPicker.props().placeholder).toBe(
          getDefaultColor(!!fullState.maxAccessor)
        );
      });

      it('sets color', () => {
        const newColor = 'new-color';
        harness.setColor(newColor + 1);
        harness.setColor(newColor + 2);
        harness.setColor(newColor + 3);
        harness.setColor('');
        expect(mockSetState).toHaveBeenCalledTimes(4);
        expect(mockSetState.mock.calls.map((args) => args[0].color)).toMatchInlineSnapshot(`
          Array [
            "new-color1",
            "new-color2",
            "new-color3",
            "#0077cc",
          ]
        `);
      });
    });
  });
});
