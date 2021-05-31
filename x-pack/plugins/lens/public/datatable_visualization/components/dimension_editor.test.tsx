/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { FramePublicAPI, VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../editor_frame_service/mocks';
import { mountWithIntl } from '@kbn/test/jest';
import { TableDimensionEditor } from './dimension_editor';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { PalettePanelContainer } from './palette_panel_container';
import { act } from 'react-dom/test-utils';

describe('data table dimension editor', () => {
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let setState: (newState: DatatableVisualizationState) => void;
  let props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  };

  function testState(): DatatableVisualizationState {
    return {
      layerId: 'first',
      columns: [
        {
          columnId: 'foo',
        },
      ],
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
        rows: [],
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

  it('should render default alignment', () => {
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(instance.find(EuiButtonGroup).prop('idSelected')).toEqual(
      expect.stringContaining('left')
    );
  });

  it('should render default alignment for number', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_alignment_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining('right'));
  });

  it('should render specific alignment', () => {
    state.columns[0].alignment = 'center';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_alignment_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining('center'));
  });

  it('should set state for the right column', () => {
    state.columns = [
      {
        columnId: 'foo',
      },
      {
        columnId: 'bar',
      },
    ];
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    instance
      .find('[data-test-subj="lnsDatatable_alignment_groups"]')
      .find(EuiButtonGroup)
      .prop('onChange')('center');
    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          alignment: 'center',
        },
        {
          columnId: 'bar',
        },
      ],
    });
  });

  it('should not show the dynamic coloring option for non numeric columns', () => {
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(instance.find('[data-test-subj="lnsDatatable_dynamicColoring_groups"]').exists()).toBe(
      false
    );
    expect(instance.find('[data-test-subj="lnsDatatable_dynamicColoring_palette"]').exists()).toBe(
      false
    );
  });

  it('should set the dynamic coloring default to "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining('none'));

    expect(instance.find('[data-test-subj="lnsDatatable_dynamicColoring_palette"]').exists()).toBe(
      false
    );
  });

  it('should show the dynamic palette display ony when colorMode is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].colorMode = 'text';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_groups"]')
        .find(EuiButtonGroup)
        .prop('idSelected')
    ).toEqual(expect.stringContaining('text'));

    expect(instance.find('[data-test-subj="lnsDatatable_dynamicColoring_palette"]').exists()).toBe(
      true
    );
  });

  it('should set the coloring mode to the right column', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns = [
      {
        columnId: 'foo',
      },
      {
        columnId: 'bar',
      },
    ];
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    instance
      .find('[data-test-subj="lnsDatatable_dynamicColoring_groups"]')
      .find(EuiButtonGroup)
      .prop('onChange')('cell');
    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          colorMode: 'cell',
          palette: expect.objectContaining({ type: 'palette' }),
        },
        {
          columnId: 'bar',
        },
      ],
    });
  });

  it('should open the palette panel when "Settings" link is clicked in the palette input', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].colorMode = 'cell';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);

    act(() =>
      (instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_trigger"]')
        .first()
        .prop('onClick') as () => void)?.()
    );

    expect(instance.find(PalettePanelContainer).exists()).toBe(true);
  });
});
