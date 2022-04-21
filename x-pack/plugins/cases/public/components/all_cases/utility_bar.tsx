/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../utility_bar';
import * as i18n from './translations';
import { AllCases, Case, DeleteCase, FilterOptions } from '../../../common/ui/types';
import { getBulkItems } from '../bulk_actions';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useUpdateCases } from '../../containers/use_bulk_update_case';

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

      const convertToDeleteCases: DeleteCase[] = cases.map(({ id, title }) => ({
        id,
        title,
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
          <UtilityBarAction
            iconSide="left"
            iconType="refresh"
            onClick={refreshCases}
            dataTestSubj="all-cases-refresh"
          >
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
CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
