/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiContextMenuPanelItemDescriptor,
  EuiIcon,
  EuiTableActionsColumnType,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { Case } from '../../../../common';
import { useDeleteCases } from '../../../containers/use_delete_cases';

import * as i18n from './translations';
import { UseActionProps, UseBulkActionProps } from '../types';

export const useBulkDeleteAction = ({
  selectedCases,
  onAction,
  isDisabled,
}: UseBulkActionProps) => {
  const euiTheme = useEuiTheme();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const { mutate: deleteCases } = useDeleteCases();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    deleteCases(
      {
        caseIds: selectedCases.map(({ id }) => id),
        successToasterTitle: i18n.DELETED_CASES(selectedCases.length),
      },
      { onSuccess: onAction }
    );
  }, [deleteCases, onAction, onCloseModal, selectedCases]);

  const color = isDisabled ? euiTheme.euiTheme.colors.disabled : 'danger';

  const action: EuiContextMenuPanelItemDescriptor = useMemo(
    () => ({
      name: <EuiTextColor color={color}>{i18n.BULK_ACTION_DELETE_LABEL}</EuiTextColor>,
      onClick: openModal,
      disabled: isDisabled,
      'data-test-subj': 'cases-bulk-action-delete',
      icon: <EuiIcon type="trash" size="m" color={color} />,
      key: 'cases-bulk-action-delete',
    }),
    [color, isDisabled, openModal]
  );

  return { action, isModalVisible, onConfirmDeletion, onCloseModal };
};

export type UseBulkDeleteAction = ReturnType<typeof useBulkDeleteAction>;

export const useDeleteAction = ({ onActionSuccess }: UseActionProps) => {
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
      deleteCases(
        {
          caseIds: [caseToBeDeleted],
          successToasterTitle: i18n.DELETED_CASES(1),
        },
        { onSuccess: onActionSuccess }
      );
    }
  }, [caseToBeDeleted, deleteCases, onActionSuccess, onCloseModal]);

  const action: EuiTableActionsColumnType<Case>['actions'][number] = useMemo(
    () => ({
      name: i18n.DELETE_ACTION_LABEL,
      description: i18n.DELETE_ACTION_LABEL,
      icon: 'trash',
      color: 'danger',
      type: 'icon',
      isPrimary: true,
      onClick: openModal,
      'data-test-subj': 'case-action-delete',
      key: 'case-action-delete',
    }),
    [openModal]
  );

  return { action, isModalVisible, onConfirmDeletion, onCloseModal };
};

export type UseDeleteAction = ReturnType<typeof useBulkDeleteAction>;
