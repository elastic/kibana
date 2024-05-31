/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { getSelectedButtonInGroup } from '@kbn/test-eui-helpers';
import {
  FramePublicAPI,
  OperationDescriptor,
  VisualizationDimensionEditorProps,
  DatasourcePublicAPI,
} from '../../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { TableDimensionEditor } from './dimension_editor';

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
      layerType: LayerTypes.DATA,
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
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: {} as DatasourcePublicAPI,
    };
  });

  const renderTableDimensionEditor = (
    overrideProps?: Partial<
      VisualizationDimensionEditorProps<DatatableVisualizationState> & {
        paletteService: PaletteRegistry;
      }
    >
  ) => {
    return render(<TableDimensionEditor {...props} {...overrideProps} />, {
      wrapper: ({ children }) => (
        <>
          <div ref={props.panelRef} />
          {children}
        </>
      ),
    });
  };

  it('should render default alignment', () => {
    renderTableDimensionEditor();
    expect(getSelectedButtonInGroup('lnsDatatable_alignment_groups')()).toHaveTextContent('Left');
  });

  it('should render default alignment for number', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    renderTableDimensionEditor();
    expect(getSelectedButtonInGroup('lnsDatatable_alignment_groups')()).toHaveTextContent('Right');
  });

  it('should render specific alignment', () => {
    state.columns[0].alignment = 'center';
    renderTableDimensionEditor();
    expect(getSelectedButtonInGroup('lnsDatatable_alignment_groups')()).toHaveTextContent('Center');
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
    renderTableDimensionEditor();
    userEvent.click(screen.getByRole('button', { name: 'Center' }));
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
    renderTableDimensionEditor();
    expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it('should set the dynamic coloring default to "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    renderTableDimensionEditor();
    expect(getSelectedButtonInGroup('lnsDatatable_dynamicColoring_groups')()).toHaveTextContent(
      'None'
    );
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it('should show the dynamic palette display ony when colorMode is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].colorMode = 'text';
    renderTableDimensionEditor();
    expect(getSelectedButtonInGroup('lnsDatatable_dynamicColoring_groups')()).toHaveTextContent(
      'Text'
    );
    expect(screen.getByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
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
    renderTableDimensionEditor();
    userEvent.click(screen.getByRole('button', { name: 'Cell' }));
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

    renderTableDimensionEditor();
    userEvent.click(screen.getByLabelText('Edit colors'));
    expect(screen.getByTestId('lns-palettePanelFlyout')).toBeInTheDocument();
  });

  it('should not show the dynamic coloring option for a bucketed operation', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const datasourceLayers = frame.datasourceLayers as Record<string, DatasourcePublicAPI>;
    datasourceLayers.first.getOperationForColumnId = jest.fn(
      () => ({ isBucketed: true } as OperationDescriptor)
    );
    state.columns[0].colorMode = 'cell';

    renderTableDimensionEditor();
    expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it('should not show the summary field for non numeric columns', () => {
    renderTableDimensionEditor();
    expect(screen.queryByTestId('lnsDatatable_summaryrow_function')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lnsDatatable_summaryrow_label')).not.toBeInTheDocument();
  });
});
