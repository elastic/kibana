/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VisualizationDimensionEditorProps } from '../../types';
import { PaletteRegistry } from '@kbn/coloring';

import { MetricVisualizationState } from './visualization';
import { MetricDimensionEditor } from './dimension_editor';
import { shallow } from 'enzyme';
import { CollapseSetting } from '../../shared_components/collapse_setting';

describe('metric dimension editor', () => {
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
      expect(component.exists(CollapseSetting)).toBeTruthy();
      expect(component.exists('[data-test-subj="lnsDynamicColoringMetricSwitch"]')).toBeFalsy();
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
  // TODO - test palette picker
});
