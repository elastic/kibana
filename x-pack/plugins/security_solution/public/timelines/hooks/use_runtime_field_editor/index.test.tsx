/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  indexPatternFieldEditorPluginMock,
  Start,
} from '../../../../../../../src/plugins/index_pattern_field_editor/public/mocks';

import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { DataView } from '../../../../../../../src/plugins/data/common';
import { TimelineId } from '../../../../common';
import { useRuntimeFieldEditor } from '.';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { renderHook, act } from '@testing-library/react-hooks';
import { sourcererActions } from '../../../common/store/actions';
import { tGridActions } from '../../../../../timelines/public';
import { DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { getRuntimeFieldSearch } from '../../../common/containers/source/runtime_field';
import { MappingRuntimeField } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../../../timelines/public/components/t_grid/body/constants';
import { defaultColumnHeaderType } from '../../../../../timelines/public/store/t_grid/defaults';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

let mockIndexPatternFieldEditor: Start;

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/containers/source/runtime_field');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('useRuntimeFieldEditor', () => {
  const fieldName = 'field name';
  const fieldCategory = 'test category';
  const indexField = {
    aggregatable: false,
    category: fieldCategory,
    indexes: ['testIndex-*'],
    name: fieldName,
    searchable: true,
    type: 'string',
  };
  const runtimeMapping: MappingRuntimeField = {
    type: 'keyword',
  };
  const timelineId = TimelineId.detectionsPage;

  beforeEach(() => {
    mockIndexPatternFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();
    useKibanaMock().services.indexPatternFieldEditor = mockIndexPatternFieldEditor;
    useKibanaMock().services.data.dataViews.get = () => new Promise(() => undefined);
  });

  const runAllPromises = () => new Promise(setImmediate);

  it('loads the DataView', async () => {
    useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);

    const { result } = renderHook(
      () => useRuntimeFieldEditor(SourcererScopeName.timeline, TimelineId.detectionsPage),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    await act(async () => runAllPromises());

    expect(result.current.isLoading).toBeFalsy();
  });

  describe('openDeleteFieldModal', () => {
    it('Removes field to the store and delete it from event table', async () => {
      useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
      mockIndexPatternFieldEditor.openDeleteModal = jest.fn().mockImplementation(({ onDelete }) => {
        if (onDelete) {
          onDelete([]);
        }
      });

      const { result } = renderHook(
        () => useRuntimeFieldEditor(SourcererScopeName.timeline, timelineId),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await act(async () => runAllPromises());

      result.current.openDeleteFieldModal(fieldName, fieldCategory);

      expect(mockDispatch).toHaveBeenCalledWith(
        sourcererActions.removeRuntimeField({
          id: DEFAULT_DATA_VIEW_ID,
          fieldName,
          fieldCategory,
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.removeColumn({
          columnId: fieldName,
          id: timelineId,
        })
      );
    });
  });

  describe('openFieldEditor', () => {
    it('Adds field to the store and to event table when adding a runtime field', async () => {
      useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
      (getRuntimeFieldSearch as jest.Mock).mockReturnValue(
        Promise.resolve({ indexField, runtimeMapping })
      );
      mockIndexPatternFieldEditor.openEditor = jest.fn().mockImplementation(({ onSave }) => {
        onSave({ name: fieldName });
      });

      const { result } = renderHook(
        () => useRuntimeFieldEditor(SourcererScopeName.timeline, timelineId),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await act(async () => runAllPromises());

      result.current.openFieldEditor();

      await act(async () => runAllPromises());

      expect(mockDispatch).toHaveBeenCalledWith(
        sourcererActions.addRuntimeField({
          id: DEFAULT_DATA_VIEW_ID,
          indexField,
          runtimeMapping,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.upsertColumn({
          column: {
            columnHeaderType: defaultColumnHeaderType,
            id: fieldName,
            initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          },
          id: timelineId,
          index: 0,
        })
      );
    });

    it('Removes previous entry from store when editing a field', async () => {
      useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
      (getRuntimeFieldSearch as jest.Mock).mockReturnValue(
        Promise.resolve({ indexField, runtimeMapping })
      );
      mockIndexPatternFieldEditor.openEditor = jest.fn().mockImplementation(({ onSave }) => {
        onSave({ name: fieldName });
      });

      const { result } = renderHook(
        () => useRuntimeFieldEditor(SourcererScopeName.timeline, timelineId),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await act(async () => runAllPromises());

      result.current.openFieldEditor(fieldName, fieldCategory);

      await act(async () => runAllPromises());

      expect(mockDispatch).toHaveBeenCalledWith(
        sourcererActions.removeRuntimeField({
          id: DEFAULT_DATA_VIEW_ID,
          fieldName,
          fieldCategory,
        })
      );
    });

    it('Removes old field from event and add new field when renaming a runtime field', async () => {
      const newFieldName = 'new field name';
      useKibanaMock().services.data.dataViews.get = () => Promise.resolve({} as DataView);
      (getRuntimeFieldSearch as jest.Mock).mockReturnValue(
        Promise.resolve({ indexField, runtimeMapping })
      );
      mockIndexPatternFieldEditor.openEditor = jest.fn().mockImplementation(({ onSave }) => {
        onSave({ name: newFieldName });
      });

      const { result } = renderHook(
        () => useRuntimeFieldEditor(SourcererScopeName.timeline, timelineId),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await act(async () => runAllPromises());

      result.current.openFieldEditor(fieldName, fieldCategory);

      await act(async () => runAllPromises());

      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.removeColumn({
          columnId: fieldName,
          id: timelineId,
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.upsertColumn({
          column: {
            columnHeaderType: defaultColumnHeaderType,
            id: newFieldName,
            initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          },
          id: timelineId,
          index: 0,
        })
      );
    });
  });
});
