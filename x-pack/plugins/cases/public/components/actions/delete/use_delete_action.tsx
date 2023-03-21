/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiIcon, EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { Case } from '../../../../common';
import { useDeleteCases } from '../../../containers/use_delete_cases';

import * as i18n from './translations';
import type { UseActionProps } from '../types';
import { useCasesContext } from '../../cases_context/use_cases_context';

const getDeleteActionTitle = (totalCases: number): string =>
  totalCases > 1 ? i18n.BULK_ACTION_DELETE_LABEL : i18n.DELETE_ACTION_LABEL;

export const useDeleteAction = ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
  const euiTheme = useEuiTheme();
  const { permissions } = useCasesContext();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [caseToBeDeleted, setCaseToBeDeleted] = useState<Case[]>([]);
  const canDelete = permissions.delete;
  const isActionDisabled = isDisabled || !canDelete;

  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback(
    (selectedCases: Case[]) => {
      onAction();
      setIsModalVisible(true);
      setCaseToBeDeleted(selectedCases);
    },
    [onAction]
  );

  const { mutate: deleteCases } = useDeleteCases();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    deleteCases(
      {
        caseIds: caseToBeDeleted.map(({ id }) => id),
        successToasterTitle: i18n.DELETED_CASES(caseToBeDeleted.length),
      },
      { onSuccess: onActionSuccess }
    );
  }, [deleteCases, onActionSuccess, onCloseModal, caseToBeDeleted]);

  const color = isActionDisabled ? euiTheme.euiTheme.colors.disabled : 'danger';

  const getAction = (selectedCases: Case[]) => {
    return {
      name: <EuiTextColor color={color}>{getDeleteActionTitle(selectedCases.length)}</EuiTextColor>,
      onClick: () => openModal(selectedCases),
      disabled: isActionDisabled,
      'data-test-subj': 'cases-bulk-action-delete',
      icon: <EuiIcon type="trash" size="m" color={color} />,
      key: 'cases-bulk-action-delete',
    };
  };

  return { getAction, isModalVisible, onConfirmDeletion, onCloseModal, canDelete };
};

export type UseDeleteAction = ReturnType<typeof useDeleteAction>;
