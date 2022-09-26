/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../utility_bar';
import * as i18n from './translations';
import { Cases, Case, FilterOptions } from '../../../common/ui/types';
import { getBulkItems } from '../bulk_actions';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useUpdateCases } from '../../containers/use_bulk_update_case';

interface OwnProps {
  data: Cases;
  enableBulkActions: boolean;
  filterOptions: FilterOptions;
  selectedCases: Case[];
  refreshCases?: (a?: boolean) => void;
}

type Props = OwnProps;

export const CasesTableUtilityBar: FunctionComponent<Props> = ({
  data,
  enableBulkActions = false,
  filterOptions,
  selectedCases,
  refreshCases,
}) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);

  // Delete case
  const { mutate: deleteCases } = useDeleteCases();

  // Update case
  const { updateBulkStatus } = useUpdateCases();

  const toggleBulkDeleteModal = useCallback((cases: Case[]) => {
    setIsModalVisible(true);
  }, []);

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

  const onConfirmDeletion = useCallback(() => {
    setIsModalVisible(false);
    deleteCases(selectedCases.map(({ id }) => id));
  }, [deleteCases, selectedCases]);

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
      {isModalVisible ? (
        <ConfirmDeleteCaseModal
          caseTitle={selectedCases[0]?.title ?? ''}
          caseQuantity={selectedCases.length}
          onCancel={onCloseModal}
          onConfirm={onConfirmDeletion}
        />
      ) : null}
    </UtilityBar>
  );
};
CasesTableUtilityBar.displayName = 'CasesTableUtilityBar';
