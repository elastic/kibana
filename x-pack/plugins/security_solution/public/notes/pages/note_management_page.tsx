/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import type { Criteria, DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import { EuiText, EuiBasicTable, EuiEmptyPrompt, EuiLoadingElastic, EuiButton } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import type { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
// TODO unify this type from the api with the one in public/common/lib/note
import type { Note } from '../../../common/api/timeline';
import {
  userSelectedPage,
  userSelectedPerPage,
  userSortedNotes,
  userFilteredNotes,
  userSearchedNotes,
  selectAllNotes,
  selectNotesPagination,
  selectNotesTableSort,
  selectNotesTableTotalItems,
} from '..';

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
    sortable: true,
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

  const { index: page, size: perPage } = useSelector((state) => selectNotesPagination(state));

  const onSelectionChange = useCallback(
    (selectedItems: Note[]) => {
      dispatch(appActions.notesTableSelectItems({ selectedItems }));
    },
    [dispatch]
  );

  useEffect(() => {
    dispatch(appActions.notesTableInitialize());
  }, [dispatch]);

  const selectedItems = useSelector((state) => appSelectors.selectNotesSelectedItems(state));

  const selection: EuiTableSelectionType<Note> = useMemo(() => {
    return {
      onSelectionChange,
      selectable: () => true,
    };
  }, [onSelectionChange]);

  const onTableChange = useCallback(
    ({ page, sort }: Criteria<Note>) => {
      if (page && sort) {
        dispatch(appActions.notesTableChange({ page, sort }));
      }
    },
    [dispatch]
  );

  const bulkDeleteNote = useCallback(() => {
    if (selectedItems.length > 0) {
      dispatch(appActions.bulkDeleteNotes({ noteIds: selectedItems }));
    }
  }, [dispatch, selectedItems]);

  const sorting = useSelector((state: State) => appSelectors.selectNotesTableSort(state));
  const deleteNote = useCallback(
    (note: Note) => dispatch(appActions.deleteNoteRequest({ note })),
    [dispatch]
  );

  const fetchLoading = useSelector((state: State) =>
    appSelectors.selectLoadingFetchByDocument(state)
  );
  const fetchError = useSelector((state) => appSelectors.selectErrorFetchByDocument(state));

  const totalItemCount = useSelector((state) => selectAllNotes(state).length);

  const notes = useSelector((state: State) => appSelectors.selectNotesTableCurrentPageItems(state));
  const startOfCurrentPage = pageIndex * pageSize + 1;
  const endOfCurrentPage = Math.min((pageIndex + 1) * pageSize, totalItemCount);

  const resultsCount =
    pageSize === 0 ? (
      <strong>{'All'}</strong>
    ) : (
      <>
        <strong>
          {startOfCurrentPage}
          {'-'}
          {endOfCurrentPage}
        </strong>
        {' of '} {totalItemCount}
      </>
    );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions,
  };

  const itemIdSelector = useCallback(
    (item: Note) => {
      return selectedItems.includes(item.noteId) ? item.noteId : item.noteId;
    },
    [selectedItems]
  );

  const actions: Array<DefaultItemAction<Note>> = [
    {
      name: 'Delete',
      description: 'Delete this note',
      color: 'primary',
      icon: 'trash',
      type: 'icon',
      onClick: (note: Note) => deleteNote(note),
    },
  ];
  const columnWithActions = [
    ...columns,
    {
      name: 'actions',
      actions,
    },
  ];

  if (fetchLoading) {
    return <EuiLoadingElastic size="xxl" />;
  }

  if (fetchError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{'Unable to load your notes'}</h2>}
        body={<p>{'No can do'}</p>}
      />
    );
  }

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
      <EuiText size="xs">
        {'Showing'} {resultsCount} <strong>{'Notes'}</strong>
      </EuiText>
      <BulkNoteDeleteButton selectedItems={selectedItems} deleteSelectedNotes={bulkDeleteNote} />
      <EuiBasicTable
        items={notes}
        pagination={pagination}
        tableCaption="Demo of EuiBasicTable"
        rowHeader="firstName"
        columns={columnWithActions}
        onChange={onTableChange}
        selection={selection}
        sorting={{ sort: sorting }}
        itemId={itemIdSelector}
      />
    </>
  );
};

NotesTable.displayName = 'NotesTable';
