/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiContextMenuPanel } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { AllCases, Case, DeleteCase, FilterOptions } from '../../../common/ui/types';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { getBulkItems } from '../bulk_actions';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { UtilityBar } from '../utility_bar/utility_bar';
import { UtilityBarAction } from '../utility_bar/utility_bar_action';
import { UtilityBarGroup } from '../utility_bar/utility_bar_group';
import { UtilityBarSection } from '../utility_bar/utility_bar_section';
import { UtilityBarText } from '../utility_bar/utility_bar_text';
import { isSelectedCasesIncludeCollections } from './helpers';
import * as i18n from './translations';

interface OwnProps {
  data: AllCases;
  enableBulkActions: boolean;
  filterOptions: FilterOptions;
  handleIsLoading: (a: boolean) => void;
  refreshCases?: (a?: boolean) => void;
  selectedCases: Case[];
}

type Props = OwnProps;

export const CasesTableUtilityBar: FunctionComponent<Props> = ({
  data,
  enableBulkActions = false,
  filterOptions,
  handleIsLoading,
  refreshCases,
  selectedCases,
}) => {
  const [deleteCases, setDeleteCases] = useState<DeleteCase[]>([]);

  // Delete case
  const {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isLoading: isDeleting,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  // Update case
  const {
    dispatchResetIsUpdated,
    isLoading: isUpdating,
    isUpdated,
    updateBulkStatus,
  } = useUpdateCases();

  useEffect(() => {
    handleIsLoading(isDeleting);
  }, [handleIsLoading, isDeleting]);

  useEffect(() => {
    handleIsLoading(isUpdating);
  }, [handleIsLoading, isUpdating]);
  useEffect(() => {
    if (isDeleted) {
      if (refreshCases != null) refreshCases();
      dispatchResetIsDeleted();
    }
    if (isUpdated) {
      if (refreshCases != null) refreshCases();
      dispatchResetIsUpdated();
    }
  }, [isDeleted, isUpdated, refreshCases, dispatchResetIsDeleted, dispatchResetIsUpdated]);

  const toggleBulkDeleteModal = useCallback(
    (cases: Case[]) => {
      handleToggleModal();

      const convertToDeleteCases: DeleteCase[] = cases.map(({ id, title, type }) => ({
        id,
        title,
        type,
      }));
      setDeleteCases(convertToDeleteCases);
    },
    [setDeleteCases, handleToggleModal]
  );

  const handleUpdateCaseStatus = useCallback(
    (status: string) => {
      updateBulkStatus(selectedCases, status);
    },
    [selectedCases, updateBulkStatus]
  );
  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        data-test-subj="cases-bulk-actions"
        items={getBulkItems({
          caseStatus: filterOptions.status,
          closePopover,
          deleteCasesAction: toggleBulkDeleteModal,
          selectedCases,
          updateCaseStatus: handleUpdateCaseStatus,
          includeCollections: isSelectedCasesIncludeCollections(selectedCases),
        })}
      />
    ),
    [selectedCases, filterOptions.status, toggleBulkDeleteModal, handleUpdateCaseStatus]
  );

  return (
    <UtilityBar border>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText data-test-subj="case-table-case-count">
            {i18n.SHOWING_CASES(data.total ?? 0)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup data-test-subj="case-table-utility-bar-actions">
          {enableBulkActions && (
            <>
              <UtilityBarText data-test-subj="case-table-selected-case-count">
                {i18n.SHOWING_SELECTED_CASES(selectedCases.length)}
              </UtilityBarText>

              <UtilityBarAction
                data-test-subj="case-table-bulk-actions"
                iconSide="right"
                iconType="arrowDown"
                popoverContent={getBulkItemsPopoverContent}
              >
                {i18n.BULK_ACTIONS}
              </UtilityBarAction>
            </>
          )}
          <UtilityBarAction iconSide="left" iconType="refresh" onClick={refreshCases}>
            {i18n.REFRESH}
          </UtilityBarAction>
        </UtilityBarGroup>
      </UtilityBarSection>
      <ConfirmDeleteCaseModal
        caseTitle={deleteCases[0]?.title ?? ''}
        isModalVisible={isDisplayConfirmDeleteModal}
        caseQuantity={deleteCases.length}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(null, deleteCases)}
      />
    </UtilityBar>
  );
};
