/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelItemDescriptor, EuiTableActionsColumnType } from '@elastic/eui';
import { useCallback, useMemo, useState } from 'react';
import { Case } from '../../../../common';
import { useDeleteCases } from '../../../containers/use_delete_cases';

import * as i18n from './translations';

export interface UseBulkDeleteActionProps {
  selectedCases: Case[];
  onAction: () => void;
}

export const useBulkDeleteAction = ({ selectedCases, onAction }: UseBulkDeleteActionProps) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback(() => {
    onAction();
    setIsModalVisible(true);
  }, [onAction]);

  const { mutate: deleteCases } = useDeleteCases();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    deleteCases({
      caseIds: selectedCases.map(({ id }) => id),
      successToasterTitle: i18n.DELETED_CASES(selectedCases.length),
    });
  }, [deleteCases, onCloseModal, selectedCases]);

  const isDisabled = selectedCases.length === 0;

  const action: EuiContextMenuPanelItemDescriptor = useMemo(
    () => ({
      name: i18n.BULK_ACTION_DELETE_SELECTED,
      onClick: openModal,
      disabled: isDisabled,
      'data-test-subj': 'cases-bulk-delete-button',
      icon: 'trash',
      key: i18n.BULK_ACTION_DELETE_SELECTED,
    }),
    [isDisabled, openModal]
  );

  return { action, isModalVisible, onConfirmDeletion, onCloseModal };
};

export type UseBulkDeleteAction = ReturnType<typeof useBulkDeleteAction>;

export const useDeleteAction = () => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [caseToBeDeleted, setCaseToBeDeleted] = useState<string>();
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback((theCase: Case) => {
    setIsModalVisible(true);
    setCaseToBeDeleted(theCase.id);
  }, []);

  const { mutate: deleteCases } = useDeleteCases();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    if (caseToBeDeleted) {
      deleteCases({
        caseIds: [caseToBeDeleted],
        successToasterTitle: i18n.DELETED_CASES(1),
      });
    }
  }, [caseToBeDeleted, deleteCases, onCloseModal]);

  const action: EuiTableActionsColumnType<Case>['actions'][number] = useMemo(
    () => ({
      name: i18n.DELETE_ACTION_LABEL,
      description: i18n.DELETE_ACTION_LABEL,
      icon: 'trash',
      color: 'danger',
      type: 'icon',
      isPrimary: true,
      onClick: openModal,
      'data-test-subj': 'cases-action-delete-button',
      key: i18n.DELETE_ACTION_LABEL,
    }),
    [openModal]
  );

  return { action, isModalVisible, onConfirmDeletion, onCloseModal };
};

export type UseDeleteAction = ReturnType<typeof useBulkDeleteAction>;
