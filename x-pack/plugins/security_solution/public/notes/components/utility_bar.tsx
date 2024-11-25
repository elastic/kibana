/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  UtilityBarGroup,
  UtilityBarText,
  UtilityBar,
  UtilityBarSection,
  UtilityBarAction,
} from '../../common/components/utility_bar';
import {
  selectNotesPagination,
  selectNotesTableSort,
  fetchNotes,
  selectNotesTableSelectedIds,
  selectNotesTableSearch,
  userSelectedBulkDelete,
  selectNotesTableCreatedByFilter,
  selectNotesTableAssociatedFilter,
} from '..';

export const BATCH_ACTIONS = i18n.translate(
  'xpack.securitySolution.notes.management.batchActionsTitle',
  {
    defaultMessage: 'Bulk actions',
  }
);

export const DELETE_SELECTED = i18n.translate(
  'xpack.securitySolution.notes.management.deleteSelected',
  {
    defaultMessage: 'Delete selected notes',
  }
);

export const REFRESH = i18n.translate('xpack.securitySolution.notes.management.refresh', {
  defaultMessage: 'Refresh',
});

/**
 * Renders the utility bar for the notes management page
 */
export const NotesUtilityBar = React.memo(() => {
  const dispatch = useDispatch();
  const pagination = useSelector(selectNotesPagination);
  const sort = useSelector(selectNotesTableSort);
  const selectedItems = useSelector(selectNotesTableSelectedIds);
  const notesCreatedByFilter = useSelector(selectNotesTableCreatedByFilter);
  const notesAssociatedFilter = useSelector(selectNotesTableAssociatedFilter);
  const resultsCount = useMemo(() => {
    const { perPage, page, total } = pagination;
    const startOfCurrentPage = perPage * (page - 1) + 1;
    const endOfCurrentPage = Math.min(perPage * page, total);
    return perPage === 0 ? 'All' : `${startOfCurrentPage}-${endOfCurrentPage} of ${total}`;
  }, [pagination]);
  const deleteSelectedNotes = useCallback(() => {
    dispatch(userSelectedBulkDelete());
  }, [dispatch]);
  const notesSearch = useSelector(selectNotesTableSearch);

  const BulkActionPopoverContent = useCallback(() => {
    return (
      <EuiContextMenuItem
        data-test-subj="notes-management-delete-notes"
        onClick={deleteSelectedNotes}
        disabled={selectedItems.length === 0}
        icon="trash"
        key="DeleteItemKey"
      >
        {DELETE_SELECTED}
      </EuiContextMenuItem>
    );
  }, [deleteSelectedNotes, selectedItems.length]);
  const refresh = useCallback(() => {
    dispatch(
      fetchNotes({
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.direction,
        filter: '',
        createdByFilter: notesCreatedByFilter,
        associatedFilter: notesAssociatedFilter,
        search: notesSearch,
      })
    );
  }, [
    dispatch,
    pagination.page,
    pagination.perPage,
    sort.field,
    sort.direction,
    notesCreatedByFilter,
    notesAssociatedFilter,
    notesSearch,
  ]);
  return (
    <UtilityBar border>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText data-test-subj="notes-management-pagination-count">
            {`Showing: ${resultsCount}`}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText data-test-subj="notes-management-selected-count">
            {selectedItems.length > 0 ? `${selectedItems.length} selected` : ''}
          </UtilityBarText>
          <UtilityBarAction
            dataTestSubj="notes-management-utility-bar-actions"
            iconSide="right"
            iconType="arrowDown"
            popoverContent={BulkActionPopoverContent}
          >
            <span data-test-subj="notes-management-utility-bar-action-button">{BATCH_ACTIONS}</span>
          </UtilityBarAction>
          <UtilityBarAction
            dataTestSubj="notes-management-utility-bar-refresh-button"
            iconSide="right"
            iconType="refresh"
            onClick={refresh}
          >
            {REFRESH}
          </UtilityBarAction>
        </UtilityBarGroup>
      </UtilityBarSection>
    </UtilityBar>
  );
});

NotesUtilityBar.displayName = 'NotesUtilityBar';
