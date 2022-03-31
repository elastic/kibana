/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import {
  useFieldBrowserOptions,
  UseFieldBrowserOptionsProps,
  UseFieldBrowserOptions,
  FieldEditorActionsRef,
} from './index';
import {
  indexPatternFieldEditorPluginMock,
  Start,
} from '../../../../../../../src/plugins/data_view_field_editor/public/mocks';

import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import type { DataView, DataViewField } from '../../../../../../../src/plugins/data/common';
import { TimelineId } from '../../../../common/types';
import { renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { removeColumn, upsertColumn } from '../../store/timeline/actions';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/constants';
import { BrowserFieldItem } from '../../../../../timelines/common/types';
import { EuiInMemoryTable } from '@elastic/eui';

let mockIndexPatternFieldEditor: Start;
jest.mock('../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const mockIndexFieldsSearch = jest.fn();
jest.mock('../../../common/containers/source/use_data_view', () => ({
  useDataView: () => ({
    indexFieldsSearch: mockIndexFieldsSearch,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const mockOnHide = jest.fn();

const runAllPromises = () => new Promise(setImmediate);

// helper function to render the hook
const renderUseFieldBrowserOptions = (props: Partial<UseFieldBrowserOptionsProps> = {}) =>
  renderHook<UseFieldBrowserOptionsProps, ReturnType<UseFieldBrowserOptions>>(
    () =>
      useFieldBrowserOptions({
        sourcererScope: SourcererScopeName.default,
        timelineId: TimelineId.test,
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

// helper function to render the hook and wait for the first update
const renderUpdatedUseFieldBrowserOptions = async (
  props: Partial<UseFieldBrowserOptionsProps> = {}
) => {
  let renderHookResult: RenderHookResult<
    UseFieldBrowserOptionsProps,
    ReturnType<UseFieldBrowserOptions>
  > | null = null;
  await act(async () => {
    renderHookResult = renderUseFieldBrowserOptions(props);
    await renderHookResult.waitForNextUpdate();
  });
  return renderHookResult!;
};

const fieldItem: BrowserFieldItem = {
  name: 'field1',
  isRuntime: true,
  category: 'test',
  selected: false,
};

describe('useFieldBrowserOptions', () => {
  beforeEach(() => {
    mockIndexPatternFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();
    mockIndexPatternFieldEditor.userPermissions.editIndexPattern = () => true;
    useKibanaMock().services.dataViewFieldEditor = mockIndexPatternFieldEditor;
    useKibanaMock().services.data.dataViews.get = () => new Promise(() => undefined);

    useKibanaMock().services.application.capabilities = {
      ...useKibanaMock().services.application.capabilities,
      indexPatterns: { save: true },
    };
    jest.clearAllMocks();
  });

  // refactor below tests once resolved: https://github.com/elastic/kibana/issues/122462
  it('should return the button and action column when user has edit permissions', async () => {
    const { result } = renderUseFieldBrowserOptions();

    expect(result.current.createFieldButton).toBeDefined();
    expect(result.current.getFieldTableColumns({ highlight: '', onHide: mockOnHide })).toHaveLength(
      5
    );
  });

  it("should not return the button and action column when user doesn't have read permissions", () => {
    mockIndexPatternFieldEditor.userPermissions.editIndexPattern = () => false;
    const { result } = renderUseFieldBrowserOptions();

    expect(result.current.createFieldButton).toBeUndefined();
    expect(result.current.getFieldTableColumns({ highlight: '', onHide: mockOnHide })).toHaveLength(
      4
    );
  });

  it('should call onHide when button is pressed', async () => {
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    const { result } = await renderUpdatedUseFieldBrowserOptions();

    const CreateFieldButton = result!.current.createFieldButton!;
    const { getByRole } = render(<CreateFieldButton onHide={mockOnHide} />, {
      wrapper: TestProviders,
    });

    expect(getByRole('button')).toBeInTheDocument();
    getByRole('button').click();
    expect(mockOnHide).toHaveBeenCalled();
  });

  it('should call onHide when the column action buttons are pressed', async () => {
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    const { result } = await renderUpdatedUseFieldBrowserOptions();

    const columns = result.current.getFieldTableColumns({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionEditRuntimeField').click();
    expect(mockOnHide).toHaveBeenCalledTimes(1);
    getByTestId('actionDeleteRuntimeField').click();
    expect(mockOnHide).toHaveBeenCalledTimes(2);
  });

  it('should dispatch the proper action when a new field is saved', async () => {
    let onSave: ((field: DataViewField) => void) | undefined;
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    useKibanaMock().services.dataViewFieldEditor.openEditor = (options) => {
      onSave = options.onSave;
      return () => {};
    };

    const { result } = await renderUpdatedUseFieldBrowserOptions();

    const CreateFieldButton = result.current.createFieldButton!;
    const { getByRole } = render(<CreateFieldButton onHide={mockOnHide} />, {
      wrapper: TestProviders,
    });

    getByRole('button').click();
    expect(onSave).toBeDefined();

    const savedField = { name: 'newField' } as DataViewField;
    onSave!(savedField);
    await runAllPromises();

    expect(mockIndexFieldsSearch).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      upsertColumn({
        id: TimelineId.test,
        column: {
          columnHeaderType: defaultColumnHeaderType,
          id: savedField.name,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
        },
        index: 0,
      })
    );
  });

  it('should dispatch the proper actions when a field is edited', async () => {
    let onSave: ((field: DataViewField) => void) | undefined;
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    useKibanaMock().services.dataViewFieldEditor.openEditor = (options) => {
      onSave = options.onSave;
      return () => {};
    };

    const { result } = await renderUpdatedUseFieldBrowserOptions();

    const columns = result.current.getFieldTableColumns({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionEditRuntimeField').click();
    expect(onSave).toBeDefined();

    const savedField = { name: `new ${fieldItem.name}` } as DataViewField;
    onSave!(savedField);
    await runAllPromises();

    expect(mockIndexFieldsSearch).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      removeColumn({
        id: TimelineId.test,
        columnId: fieldItem.name,
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      upsertColumn({
        id: TimelineId.test,
        column: {
          columnHeaderType: defaultColumnHeaderType,
          id: savedField.name,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
        },
        index: 0,
      })
    );
  });

  it('should dispatch the proper actions when a field is removed', async () => {
    let onDelete: ((fields: string[]) => void) | undefined;
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    useKibanaMock().services.dataViewFieldEditor.openDeleteModal = (options) => {
      onDelete = options.onDelete;
      return () => {};
    };

    const { result } = await renderUpdatedUseFieldBrowserOptions();

    const columns = result.current.getFieldTableColumns({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    getByTestId('actionDeleteRuntimeField').click();
    expect(onDelete).toBeDefined();

    onDelete!([fieldItem.name]);
    await runAllPromises();

    expect(mockIndexFieldsSearch).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      removeColumn({
        id: TimelineId.test,
        columnId: fieldItem.name,
      })
    );
  });

  it("should store 'closeEditor' in the actions ref when editor is open by create button", async () => {
    const mockCloseEditor = jest.fn();
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    useKibanaMock().services.dataViewFieldEditor.openEditor = () => mockCloseEditor;

    const editorActionsRef: FieldEditorActionsRef = React.createRef();

    const { result } = await renderUpdatedUseFieldBrowserOptions({ editorActionsRef });

    const CreateFieldButton = result!.current.createFieldButton!;
    const { getByRole } = render(<CreateFieldButton onHide={mockOnHide} />, {
      wrapper: TestProviders,
    });

    expect(editorActionsRef?.current).toBeNull();

    getByRole('button').click();

    expect(mockCloseEditor).not.toHaveBeenCalled();
    expect(editorActionsRef?.current?.closeEditor).toBeDefined();

    editorActionsRef!.current!.closeEditor();

    expect(mockCloseEditor).toHaveBeenCalled();
    expect(editorActionsRef!.current).toBeNull();
  });

  it("should store 'closeEditor' in the actions ref when editor is open by edit button", async () => {
    const mockCloseEditor = jest.fn();
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
    useKibanaMock().services.dataViewFieldEditor.openEditor = () => mockCloseEditor;

    const editorActionsRef: FieldEditorActionsRef = React.createRef();

    const { result } = await renderUpdatedUseFieldBrowserOptions({ editorActionsRef });

    const columns = result.current.getFieldTableColumns({
      highlight: '',
      onHide: mockOnHide,
    });

    const { getByTestId } = render(<EuiInMemoryTable items={[fieldItem]} columns={columns} />, {
      wrapper: TestProviders,
    });

    expect(editorActionsRef?.current).toBeNull();

    getByTestId('actionEditRuntimeField').click();

    expect(mockCloseEditor).not.toHaveBeenCalled();
    expect(editorActionsRef?.current?.closeEditor).toBeDefined();

    editorActionsRef!.current!.closeEditor();

    expect(mockCloseEditor).toHaveBeenCalled();
    expect(editorActionsRef!.current).toBeNull();
  });
});
