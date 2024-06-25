/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import { render, screen } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import {
  DatasourcePublicAPI,
  FramePublicAPI,
  VisualizationDimensionEditorProps,
} from '../../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { TableDimensionEditorAdditionalSection } from './dimension_editor_addtional_section';

describe('data table dimension editor additional section', () => {
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

  it('should set the summary row function default to "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    render(<TableDimensionEditorAdditionalSection {...props} />);
    expect(screen.getByRole('combobox')).toHaveValue('None');
    expect(screen.queryByTestId('lnsDatatable_summaryrow_label')).not.toBeInTheDocument();
  });

  it('should show the summary row label input ony when summary row is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].summaryRow = 'sum';
    render(<TableDimensionEditorAdditionalSection {...props} />);
    expect(screen.getByRole('combobox')).toHaveValue('Sum');
    expect(screen.getByTestId('lnsDatatable_summaryrow_label')).toHaveValue('Sum');
  });

  it("should show the correct summary row name when user's changes summary label", () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].summaryRow = 'sum';
    state.columns[0].summaryLabel = 'MySum';
    render(<TableDimensionEditorAdditionalSection {...props} />);
    expect(screen.getByRole('combobox')).toHaveValue('Sum');
    expect(screen.getByTestId('lnsDatatable_summaryrow_label')).toHaveValue('MySum');
  });
});
