/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFieldText } from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  DatasourcePublicAPI,
  FramePublicAPI,
  VisualizationDimensionEditorProps,
} from '../../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TableDimensionEditorAdditionalSection } from './dimension_editor_addtional_section';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';

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
    const instance = mountWithIntl(<TableDimensionEditorAdditionalSection {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_summaryrow_function"]')
        .find(EuiComboBox)
        .prop('selectedOptions')
    ).toEqual([{ value: 'none', label: 'None' }]);

    expect(instance.find('[data-test-subj="lnsDatatable_summaryrow_label"]').exists()).toBe(false);
  });

  it('should show the summary row label input ony when summary row is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].summaryRow = 'sum';
    const instance = mountWithIntl(<TableDimensionEditorAdditionalSection {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_summaryrow_function"]')
        .find(EuiComboBox)
        .prop('selectedOptions')
    ).toEqual([{ value: 'sum', label: 'Sum' }]);

    expect(
      instance
        .find('[data-test-subj="lnsDatatable_summaryrow_label"]')
        .find(EuiFieldText)
        .prop('value')
    ).toBe('Sum');
  });

  it("should show the correct summary row name when user's changes summary label", () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.columns[0].summaryRow = 'sum';
    state.columns[0].summaryLabel = 'MySum';
    const instance = mountWithIntl(<TableDimensionEditorAdditionalSection {...props} />);
    expect(
      instance
        .find('[data-test-subj="lnsDatatable_summaryrow_function"]')
        .find(EuiComboBox)
        .prop('selectedOptions')
    ).toEqual([{ value: 'sum', label: 'Sum' }]);

    expect(
      instance
        .find('[data-test-subj="lnsDatatable_summaryrow_label"]')
        .find(EuiFieldText)
        .prop('value')
    ).toBe('MySum');
  });
});
