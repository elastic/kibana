/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Toolbar } from './toolbar';
import { MetricVisualizationState } from './visualization';
import { createMockFramePublicAPI } from '../../mocks';
import { HTMLAttributes, ReactWrapper } from 'enzyme';
import { EuiFieldText } from '@elastic/eui';
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
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-col-id',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  };

  const frame = createMockFramePublicAPI();

  class Harness {
    public _wrapper;

    constructor(wrapper: ReactWrapper<HTMLAttributes, unknown, React.Component<{}, {}, unknown>>) {
      this._wrapper = wrapper;
    }

    private get subtitleField() {
      return this._wrapper.find(EuiFieldText);
    }

    public get textOptionsButton() {
      const toolbarButtons = this._wrapper.find('button[data-test-subj="lnsLabelsButton"]');
      return toolbarButtons.at(0);
    }

    public toggleOpenTextOptions() {
      this.textOptionsButton.simulate('click');
    }

    public setSubtitle(subtitle: string) {
      act(() => {
        this.subtitleField.props().onChange!({
          target: { value: subtitle },
        } as unknown as ChangeEvent<HTMLInputElement>);
      });
    }
  }

  const mockSetState = jest.fn();

  const getHarnessWithState = (state: MetricVisualizationState) =>
    new Harness(mountWithIntl(<Toolbar state={state} setState={mockSetState} frame={frame} />));

  afterEach(() => mockSetState.mockClear());

  describe('text options', () => {
    it('sets a subtitle', () => {
      const localHarness = getHarnessWithState({ ...fullState, breakdownByAccessor: undefined });

      localHarness.toggleOpenTextOptions();

      const newSubtitle = 'new subtitle hey';
      localHarness.setSubtitle(newSubtitle + ' 1');
      localHarness.setSubtitle(newSubtitle + ' 2');
      localHarness.setSubtitle(newSubtitle + ' 3');
      expect(mockSetState.mock.calls.map(([state]) => state.subtitle)).toMatchInlineSnapshot(`
        Array [
          "new subtitle hey 1",
          "new subtitle hey 2",
          "new subtitle hey 3",
        ]
      `);
    });

    it('hides text options when has breakdown by', () => {
      expect(
        getHarnessWithState({
          ...fullState,
          breakdownByAccessor: 'some-accessor',
        }).textOptionsButton.exists()
      ).toBeFalsy();
    });
  });
});
