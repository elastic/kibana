/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import type { DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
// TODO unify this type from the api with the one in public/common/lib/note
import type { Note } from '../../../common/api/timeline';
import {
  userSelectedPage,
  userSelectedPerPage,
  userSelectedRow,
  userSortedNotes,
  selectAllNotes,
  selectNotesPagination,
  selectNotesTableSort,
  selectNotesTableTotalItems,
  fetchNotes,
  deleteNote,
  deleteNotes,
  selectNotesTableSelectedIds,
  selectNotesTableSearch,
} from '..';
import { SearchRow } from '../components/search_row';
import { NotesUtilityBar } from '../components/utility_bar';

const columns: Array<EuiBasicTableColumn<Note>> = [
  {
    field: 'created',
    name: 'Last Edited',
    sortable: true,
  },
  {
    field: 'createdBy',
    name: 'Created by',
  },
  {
    field: 'eventId',
    name: 'Document id',
    sortable: true,
  },
  {
    field: 'timelineId',
    name: 'Timeline id',
  },
  {
    field: 'note',
    name: 'Note',
  },
];

const pageSizeOptions = [50, 25, 10, 0];

const BulkNoteDeleteButton = ({
  selectedItems,
  deleteSelectedNotes,
}: {
  selectedItems: string[];
  deleteSelectedNotes: () => void;
}) => {
  return selectedItems.length > 0 ? (
    <EuiButton color="danger" iconType="trash" onClick={deleteSelectedNotes}>
      {`Delete ${selectedItems.length} Notes`}
    </EuiButton>
  ) : null;
};

/**
 *
 */
export const NotesTable = () => {
  const dispatch = useDispatch();
  const notes = useSelector(selectAllNotes);
  const pagination = useSelector(selectNotesPagination);
  const sort = useSelector(selectNotesTableSort);
  const totalItems = useSelector(selectNotesTableTotalItems);
  const selectedItems = useSelector(selectNotesTableSelectedIds);
  const notesSearch = useSelector(selectNotesTableSearch);

  const fetchData = useCallback(() => {
    dispatch(
      fetchNotes({
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.direction,
        filter: '',
        search: notesSearch,
      })
    );
  }, [dispatch, pagination.page, pagination.perPage, sort.field, sort.direction, notesSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onTableChange = useCallback(
    ({
      page,
      sort: newSort,
    }: {
      page?: { index: number; size: number };
      sort?: { field: string; direction: string };
    }) => {
      if (page) {
        dispatch(userSelectedPage(page.index + 1));
        dispatch(userSelectedPerPage(page.size));
      }
      if (newSort) {
        dispatch(userSortedNotes({ field: newSort.field, order: newSort.direction }));
      }
    },
    [dispatch]
  );

  const onDeleteNote = useCallback(
    (id: string) => {
      dispatch(deleteNote({ id }));
    },
    [dispatch]
  );

  const onSelectionChange = useCallback(
    (selection: Note[]) => {
      const rowIds = selection.map((item) => item.noteId);
      dispatch(userSelectedRow(rowIds));
    },
    [dispatch]
  );

  const itemIdSelector = useCallback((item: Note) => {
    return item.noteId;
  }, []);

  const deleteSelectedNotes = useCallback(() => {
    dispatch(deleteNotes({ ids: selectedItems }));
  }, [dispatch, selectedItems]);

  const columnWithActions = useMemo(() => {
    const actions: Array<DefaultItemAction<Note>> = [
      {
        name: 'Delete',
        description: 'Delete this note',
        color: 'primary',
        icon: 'trash',
        type: 'icon',
        onClick: (note: Note) => deleteNote({ id: note.noteId }),
      },
    ];
    return [
      ...columns,
      {
        name: 'actions',
        actions,
      },
    ];
  }, []);

  // if (fetchLoading) {
  //   return <EuiLoadingElastic size="xxl" />;
  // }

  // if (fetchError) {
  //   return (
  //     <EuiEmptyPrompt
  //       iconType="error"
  //       color="danger"
  //       title={<h2>{'Unable to load your notes'}</h2>}
  //       body={<p>{'No can do'}</p>}
  //     />
  //   );
  // }

  const currentPagination = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: totalItems,
      pageSizeOptions,
    };
  }, [pagination, totalItems]);

  const selection = useMemo(() => {
    return {
      onSelectionChange,
      selectable: () => true,
    };
  }, [onSelectionChange]);

  if (notes.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="editorStrike"
        title={<h2>{'No notes'}</h2>}
        body={<p>{'Add a note to get started'}</p>}
      />
    );
  }

  return (
    <>
      <SearchRow />
      <NotesUtilityBar />
      <BulkNoteDeleteButton
        selectedItems={selectedItems}
        deleteSelectedNotes={deleteSelectedNotes}
      />
      <EuiBasicTable
        items={notes}
        pagination={currentPagination}
        columns={columnWithActions}
        onChange={onTableChange}
        selection={selection}
        sorting={{ sort }}
        itemId={itemIdSelector}
      />
    </>
  );
};

NotesTable.displayName = 'NotesTable';
