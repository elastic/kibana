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
import { mountWithIntl } from '@kbn/test/jest';
import { MetricDimensionEditor } from './dimension_editor';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { ColorMode, PaletteRegistry } from 'src/plugins/charts/public';
import { act } from 'react-dom/test-utils';
import { PalettePanelContainer } from '../shared_components';
import { layerTypes } from '../../common';
import { MetricState } from '../../common/expressions';

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

    expect(props.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        palette: expect.objectContaining({
          params: expect.objectContaining({
            stops: expect.any(Array), // shallow check it's ok
          }),
        }),
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

    expect(instance.find(PalettePanelContainer).exists()).toBe(true);
  });
});
