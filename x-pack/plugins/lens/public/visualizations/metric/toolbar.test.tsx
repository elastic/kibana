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
import { MetricVisualizationState } from './visualization';
import { createMockFramePublicAPI } from '../../mocks';
import { HTMLAttributes, ReactWrapper } from 'enzyme';
import { EuiButtonGroup, EuiFieldText } from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import { ToolbarButton } from '@kbn/kibana-react-plugin/public';
import { act } from 'react-dom/test-utils';

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

  const fullState: MetricVisualizationState = {
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
  }

  let harness: Harness;
  const mockSetState = jest.fn();
  beforeEach(() => {
    const wrapper = mountWithIntl(
      <Toolbar state={fullState} setState={mockSetState} frame={frame} />
    );
    harness = new Harness(wrapper);
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
      const localHarness = new Harness(
        mountWithIntl(
          <Toolbar
            state={{ ...fullState, maxAccessor: undefined }}
            setState={mockSetState}
            frame={frame}
          />
        )
      );

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
  });
});
