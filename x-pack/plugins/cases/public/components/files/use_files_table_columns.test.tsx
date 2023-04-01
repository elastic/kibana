/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesTableColumnsProps } from './use_files_table_columns';
import { useFilesTableColumns } from './use_files_table_columns';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { renderHook } from '@testing-library/react-hooks';

describe('useCasesColumns ', () => {
  let appMockRender: AppMockRenderer;

  const useCasesColumnsProps: FilesTableColumnsProps = {
    showPreview: () => {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('return all files table columns correctly', async () => {
    const { result } = renderHook(() => useFilesTableColumns(useCasesColumnsProps), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "cases-files-table-filename",
          "name": "Name",
          "render": [Function],
          "width": "60%",
        },
        Object {
          "data-test-subj": "cases-files-table-filetype",
          "name": "Type",
          "render": [Function],
        },
        Object {
          "data-test-subj": "cases-files-table-date-added",
          "dataType": "date",
          "field": "created",
          "name": "Date Added",
        },
        Object {
          "actions": Array [
            Object {
              "description": "Download File",
              "isPrimary": true,
              "name": "Download",
              "render": [Function],
            },
            Object {
              "color": "danger",
              "data-test-subj": "cases-files-table-action-delete",
              "description": "Delete File",
              "icon": "trash",
              "isPrimary": true,
              "name": "Delete",
              "onClick": [Function],
              "type": "icon",
            },
          ],
          "name": "Actions",
          "width": "120px",
        },
      ]
    `);
  });
});
