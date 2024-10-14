/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import { act, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { EuiButtonGroupTestHarness } from '@kbn/test-eui-helpers';
import { FramePublicAPI, DatasourcePublicAPI, OperationDescriptor } from '../../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { TableDimensionEditor, TableDimensionEditorProps } from './dimension_editor';
import { ColumnState } from '../../../../common/expressions';
import { capitalize } from 'lodash';
import { I18nProvider } from '@kbn/i18n-react';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';

describe('data table dimension editor', () => {
  let user: UserEvent;
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let btnGroups: {
    colorMode: EuiButtonGroupTestHarness;
    alignment: EuiButtonGroupTestHarness;
  };
  let mockOperationForFirstColumn: (overrides?: Partial<OperationDescriptor>) => void;

  let props: TableDimensionEditorProps;

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

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    btnGroups = {
      colorMode: new EuiButtonGroupTestHarness('lnsDatatable_dynamicColoring_groups'),
      alignment: new EuiButtonGroupTestHarness('lnsDatatable_alignment_groups'),
    };
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
              params: {},
            },
          },
        ],
        rows: [],
      },
    };
    props = {
      accessor: 'foo',
      frame,
      groupId: 'columns',
      layerId: 'first',
      state,
      setState: jest.fn(),
      isDarkMode: false,
      paletteService: chartPluginMock.createPaletteRegistry(),
      panelRef: React.createRef(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: {} as DatasourcePublicAPI,
    };

    mockOperationForFirstColumn = (overrides: Partial<OperationDescriptor> = {}) => {
      frame!.datasourceLayers!.first!.getOperationForColumnId = jest.fn().mockReturnValue({
        label: 'label',
        isBucketed: false,
        dataType: 'string',
        hasTimeShift: false,
        hasReducedTimeRange: false,
        ...overrides,
      } satisfies OperationDescriptor);
    };
    mockOperationForFirstColumn();
  });

  const renderTableDimensionEditor = (overrideProps?: Partial<TableDimensionEditorProps>) => {
    return render(<TableDimensionEditor {...props} {...overrideProps} />, {
      wrapper: ({ children }) => (
        <I18nProvider>
          <div ref={props.panelRef} />
          {children}
        </I18nProvider>
      ),
    });
  };

  it('should render default alignment', () => {
    renderTableDimensionEditor();
    expect(btnGroups.alignment.selected).toHaveTextContent('Left');
  });

  it('should render default alignment for number', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    renderTableDimensionEditor();
    expect(btnGroups.alignment.selected).toHaveTextContent('Right');
  });

  it('should render default alignment for ranges', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.columns[0].meta.params = { id: 'range' };
    renderTableDimensionEditor();
    expect(btnGroups.alignment.selected).toHaveTextContent('Left');
  });

  it('should render specific alignment', () => {
    state.columns[0].alignment = 'center';
    renderTableDimensionEditor();
    expect(btnGroups.alignment.selected).toHaveTextContent('Center');
  });

  it('should set state for the right column', async () => {
    state.columns = [
      {
        columnId: 'foo',
      },
      {
        columnId: 'bar',
      },
    ];
    renderTableDimensionEditor();
    await user.click(screen.getByRole('button', { name: 'Center' }));
    jest.advanceTimersByTime(256);
    expect(props.setState).toHaveBeenCalledWith({
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

  it('should set the dynamic coloring default to "none"', () => {
    state.columns[0].colorMode = undefined;
    renderTableDimensionEditor();
    expect(btnGroups.colorMode.selected).toHaveTextContent('None');
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it.each<DatatableColumnType>(['date'])(
    'should not show the dynamic coloring option for "%s" columns',
    (type) => {
      frame.activeData!.first.columns[0].meta.type = type;

      renderTableDimensionEditor();
      expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).not.toBeInTheDocument();
      expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
    }
  );

  it.each<ColumnState['colorMode']>(['cell', 'text'])(
    'should show the palette options ony when colorMode is "%s"',
    (colorMode) => {
      state.columns[0].colorMode = colorMode;
      renderTableDimensionEditor();
      expect(btnGroups.colorMode.selected).toHaveTextContent(capitalize(colorMode));
      expect(screen.getByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
    }
  );

  it.each<ColumnState['colorMode']>(['none', undefined])(
    'should not show the palette options when colorMode is "%s"',
    (colorMode) => {
      state.columns[0].colorMode = colorMode;
      renderTableDimensionEditor();
      expect(btnGroups.colorMode.selected).toHaveTextContent(capitalize(colorMode ?? 'none'));
      expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
    }
  );

  it('should set the coloring mode to the right column', async () => {
    state.columns = [{ columnId: 'foo' }, { columnId: 'bar' }];
    renderTableDimensionEditor();
    await user.click(screen.getByRole('button', { name: 'Cell' }));
    jest.advanceTimersByTime(256);
    expect(props.setState).toHaveBeenCalledWith({
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

  it.each<{ flyout: 'terms' | 'values'; isBucketed: boolean; type: DatatableColumnType }>([
    { flyout: 'terms', isBucketed: true, type: 'number' },
    { flyout: 'terms', isBucketed: false, type: 'string' },
    { flyout: 'values', isBucketed: false, type: 'number' },
  ])(
    'should show color by $flyout flyout when bucketing is $isBucketed with $type column',
    async ({ flyout, isBucketed, type }) => {
      state.columns[0].colorMode = 'cell';
      frame.activeData!.first.columns[0].meta.type = type;
      mockOperationForFirstColumn({ isBucketed });
      renderTableDimensionEditor();

      await user.click(screen.getByLabelText('Edit colors'));
      act(() => jest.advanceTimersByTime(256));

      expect(screen.getByTestId(`lns-palettePanel-${flyout}`)).toBeInTheDocument();
    }
  );

  it('should show the dynamic coloring option for a bucketed operation', () => {
    state.columns[0].colorMode = 'cell';
    frame.activeData!.first.columns[0].meta.type = 'string';
    mockOperationForFirstColumn({ isBucketed: true });

    renderTableDimensionEditor();
    expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).toBeInTheDocument();
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
  });

  it('should clear palette and colorMapping when colorMode is set to "none"', () => {
    state.columns[0].colorMode = 'cell';
    state.columns[0].palette = {
      type: 'palette',
      name: 'default',
    };
    state.columns[0].colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;

    renderTableDimensionEditor();

    act(() => {
      // this throws an error about state update even in act()
      btnGroups.colorMode.select('None');
    });

    jest.advanceTimersByTime(256);
    expect(props.setState).toBeCalledWith({
      ...state,
      columns: [
        expect.objectContaining({
          colorMode: 'none',
          palette: undefined,
          colorMapping: undefined,
        }),
      ],
    });
  });

  [true, false].forEach((isTransposed) => {
    it(`should${isTransposed ? ' not' : ''} show hidden switch when column is${
      !isTransposed ? ' not' : ''
    } transposed`, () => {
      state.columns[0].isTransposed = isTransposed;
      renderTableDimensionEditor();

      const hiddenSwitch = screen.queryByTestId('lns-table-column-hidden');
      if (isTransposed) {
        expect(hiddenSwitch).not.toBeInTheDocument();
      } else {
        expect(hiddenSwitch).toBeInTheDocument();
      }
    });
  });
});
