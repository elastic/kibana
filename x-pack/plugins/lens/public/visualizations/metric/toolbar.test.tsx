/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Toolbar } from './toolbar';
import { MetricVisualizationState } from './visualization';
import { createMockFramePublicAPI } from '../../mocks';
import { HTMLAttributes, ReactWrapper } from 'enzyme';
import { EuiButtonGroup } from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import { ToolbarButton } from '@kbn/kibana-react-plugin/public';

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

    public get currentState() {
      return this.toolbarComponent.props().state;
    }

    public toggleOpenDisplayOptions() {
      const toolbarButtons = this._wrapper.find(ToolbarButton);
      toolbarButtons.at(1).simulate('click');
    }

    public setProgressDirection(direction: LayoutDirection) {
      this._wrapper.find(EuiButtonGroup).props().onChange(direction);
      this._wrapper.update();
    }

    public get progressDirectionDisabled() {
      return this._wrapper.find(EuiButtonGroup).props().isDisabled;
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
