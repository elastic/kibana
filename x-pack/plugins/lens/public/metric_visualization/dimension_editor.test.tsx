/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { FramePublicAPI, VisualizationDimensionEditorProps } from '../types';
import { createMockDatasource, createMockFramePublicAPI } from '../mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { MetricDimensionEditor } from './dimension_editor';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { ColorMode } from '@kbn/charts-plugin/public';
import {
  CustomizablePalette,
  PaletteOutput,
  PaletteRegistry,
  CustomPaletteParams,
} from '@kbn/coloring';
import { act } from 'react-dom/test-utils';

import { PalettePanelContainer } from '../shared_components';
import { layerTypes } from '../../common';
import type { MetricState } from '../../common/types';

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

function paletteParamsContaining(paramsToCheck: PaletteOutput<CustomPaletteParams>['params']) {
  return expect.objectContaining({
    palette: expect.objectContaining({
      params: expect.objectContaining(paramsToCheck),
    }),
  });
}

describe('metric dimension editor', () => {
  let frame: FramePublicAPI;
  let state: MetricState;
  let setState: (newState: MetricState) => void;
  let props: VisualizationDimensionEditorProps<MetricState> & {
    paletteService: PaletteRegistry;
  };

  function testState(): MetricState {
    return {
      layerId: 'first',
      layerType: layerTypes.DATA,
      accessor: 'foo',
    };
  }

  beforeEach(() => {
    state = testState();
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
    frame.activeData = {
      first: {
        type: 'datatable',
        columns: [
          {
            id: 'foo',
            name: 'foo',
            meta: {
              type: 'string',
            },
          },
        ],
        rows: [{ foo: 5 }],
      },
    };
    setState = jest.fn();
    props = {
      accessor: 'foo',
      frame,
      groupId: 'columns',
      layerId: 'first',
      state,
      setState,
      paletteService: chartPluginMock.createPaletteRegistry(),
      panelRef: React.createRef(),
    };
    // add a div to the ref
    props.panelRef.current = document.createElement('div');
  });

  it('should not show the dynamic coloring option for non numeric columns', () => {
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);
    expect(instance.find('[data-test-subj="lnsMetric_dynamicColoring_groups"]').exists()).toBe(
      false
    );
    expect(instance.find('[data-test-subj="lnsMetric_dynamicColoring_palette"]').exists()).toBe(
      false
    );
  });

  it('should set the dynamic coloring default to "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining(ColorMode.None));

    expect(instance.find('[data-test-subj="lnsMetric_dynamicColoring_palette"]').exists()).toBe(
      false
    );
  });

  it('should show the dynamic palette display ony when colorMode is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.colorMode = ColorMode.Labels;
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining(ColorMode.Labels));

    expect(instance.find('[data-test-subj="lnsMetric_dynamicColoring_palette"]').exists()).toBe(
      true
    );
  });

  it('should prefill the palette stops with some colors when enabling coloring', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);

    act(() => {
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('onChange')!(ColorMode.Labels);
    });
    instance.update();

    expect(props.setState).toHaveBeenCalledWith(
      paletteParamsContaining({
        stops: expect.any(Array), // shallow check it's ok
      })
    );
  });

  it('should open the palette panel when "Settings" link is clicked in the palette input', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.colorMode = ColorMode.Background;
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);

    act(() => {
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_trigger"]')
        .first()
        .simulate('click');
    });
    instance.update();

    expect(instance.find(PalettePanelContainer).exists()).toBe(true);
  });

  it('should provide have a special data min/max for zero metric value', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = 0;
    state.colorMode = ColorMode.Background;
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);

    act(() => {
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_trigger"]')
        .first()
        .simulate('click');
    });
    instance.update();

    expect(instance.find(CustomizablePalette).prop('dataBounds')).toEqual({ min: -50, max: 100 });
  });

  it('should work for negative metric value', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = -1;
    state.colorMode = ColorMode.Background;
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);

    act(() => {
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_trigger"]')
        .first()
        .simulate('click');
    });
    instance.update();

    expect(instance.find(CustomizablePalette).prop('dataBounds')).toEqual({ min: -2, max: 0 });
  });

  it('should apply an initial range with shifted stops (first stop === rangeMin)', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = 5;
    state.colorMode = ColorMode.None;
    state.palette = undefined;
    const instance = mountWithIntl(<MetricDimensionEditor {...props} />);

    act(() => {
      instance
        .find('[data-test-subj="lnsMetric_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('onChange')!(ColorMode.Background);
    });

    expect(setState).toHaveBeenCalledWith(
      paletteParamsContaining({
        stops: expect.arrayContaining([]),
      })
    );
  });
});
