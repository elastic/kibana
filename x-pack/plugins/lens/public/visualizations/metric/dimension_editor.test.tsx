/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';
import { VisualizationDimensionEditorProps } from '../../types';
import { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';

import { MetricVisualizationState } from './visualization';
import { DimensionEditor } from './dimension_editor';
import { HTMLAttributes, ReactWrapper, shallow } from 'enzyme';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { EuiButtonGroup, EuiFieldText } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { LayoutDirection } from '@elastic/charts';
import { act } from 'react-dom/test-utils';

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
  let props: VisualizationDimensionEditorProps<MetricVisualizationState> & {
    paletteService: PaletteRegistry;
  };

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

  describe('primary metric dimension', () => {
    const accessor = 'primary-metric-col-id';

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
  });

  describe('secondary metric dimension', () => {
    const accessor = 'secondary-metric-col-id';

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

    it('sets metric prefix', () => {
      const setState = jest.fn();
      const localState = { ...fullState, secondaryMetricAccessor: accessor };
      const component = shallow(
        <DimensionEditor {...props} state={localState} setState={setState} accessor={accessor} />
      );

      const newVal = 'Metric explanation';
      component.find(EuiFieldText).props().onChange!({
        target: { value: newVal },
      } as ChangeEvent<HTMLInputElement>);
      expect(setState).toHaveBeenCalledWith({ ...localState, secondaryPrefix: newVal });
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

  describe('breakdown-by dimension', () => {
    const accessor = 'breakdown-col-id';

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
      const setState = jest.fn();
      const currentCollapseFn = 'sum';
      const localState = {
        ...fullState,
        breakdownByAccessor: accessor,
        collapseFn: currentCollapseFn,
      };
      const component = shallow(
        <DimensionEditor {...props} state={localState} setState={setState} accessor={accessor} />
      );
      const collapseComponentProps = component.find(CollapseSetting).props();
      expect(collapseComponentProps.value).toBe(currentCollapseFn);
      const newCollapseFunc = 'min';
      collapseComponentProps.onChange(newCollapseFunc);
      expect(setState).toHaveBeenCalledWith({ ...localState, collapseFn: newCollapseFunc });
    });
  });
});
