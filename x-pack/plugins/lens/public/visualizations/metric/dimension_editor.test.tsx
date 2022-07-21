/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import { VisualizationDimensionEditorProps } from '../../types';
import { PaletteRegistry } from '@kbn/coloring';

import { MetricVisualizationState } from './visualization';
import { MetricDimensionEditor } from './dimension_editor';
import { shallow } from 'enzyme';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { EuiFieldText } from '@elastic/eui';

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

  const state: MetricVisualizationState = {
    layerId: 'first',
    layerType: 'data',
  };

  describe('breakdown-by dimension', () => {
    const accessor = 'breakdown-col-id';

    it('renders when the accessor matches', () => {
      const component = shallow(
        <MetricDimensionEditor
          {...props}
          state={{ ...state, breakdownByAccessor: accessor }}
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
      const localState = { ...state, breakdownByAccessor: accessor, collapseFn: currentCollapseFn };
      const component = shallow(
        <MetricDimensionEditor
          {...props}
          state={localState}
          setState={setState}
          accessor={accessor}
        />
      );
      const collapseComponentProps = component.find(CollapseSetting).props();
      expect(collapseComponentProps.value).toBe(currentCollapseFn);
      const newCollapseFunc = 'min';
      collapseComponentProps.onChange(newCollapseFunc);
      expect(setState).toHaveBeenCalledWith({ ...localState, collapseFn: newCollapseFunc });
    });
  });

  describe('secondary metric dimension', () => {
    const accessor = 'secondary-metric-col-id';

    it('renders when the accessor matches', () => {
      const component = shallow(
        <MetricDimensionEditor
          {...props}
          state={{ ...state, secondaryMetricAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeFalsy();
    });

    it('sets metric prefix', () => {
      const setState = jest.fn();
      const localState = { ...state, secondaryMetricAccessor: accessor };
      const component = shallow(
        <MetricDimensionEditor
          {...props}
          state={localState}
          setState={setState}
          accessor={accessor}
        />
      );

      const newVal = 'Metric explanation';
      component.find(EuiFieldText).props().onChange!({
        target: { value: newVal },
      } as ChangeEvent<HTMLInputElement>);
      expect(setState).toHaveBeenCalledWith({ ...localState, secondaryPrefix: newVal });
    });
  });

  describe('primary metric dimension', () => {
    const accessor = 'primary-metric-col-id';

    it('renders when the accessor matches', () => {
      const component = shallow(
        <MetricDimensionEditor
          {...props}
          state={{ ...state, metricAccessor: accessor }}
          accessor={accessor}
        />
      );

      expect(component.exists(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeTruthy();
      expect(component.exists(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeFalsy();
      expect(component.exists(SELECTORS.BREAKDOWN_EDITOR)).toBeFalsy();
    });
  });
});
