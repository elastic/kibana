/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import * as i18n from '../case_view/translations';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { PropertyActions } from '../property_actions';
import type { Case } from '../../../common/ui/types';
import type { CaseService } from '../../containers/use_get_case_user_actions';
import { useAllCasesNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesToast } from '../../common/use_cases_toast';

interface CaseViewActions {
  caseData: Case;
  currentExternalIncident: CaseService | null;
}

const ActionsComponent: React.FC<CaseViewActions> = ({ caseData, currentExternalIncident }) => {
  const { mutate: deleteCases } = useDeleteCases();
  const { navigateToAllCases } = useAllCasesNavigation();
  const { permissions } = useCasesContext();
  const { showSuccessToast } = useCasesToast();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const openModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const propertyActions = useMemo(
    () => [
      {
        iconType: 'copyClipboard',
        label: i18n.COPY_ID_ACTION_LABEL,
        onClick: () => {
          navigator.clipboard.writeText(caseData.id);
          showSuccessToast(i18n.COPY_ID_ACTION_SUCCESS);
        },
      },
      ...(permissions.delete
        ? [
            {
              iconType: 'trash',
              label: i18n.DELETE_CASE(),
              onClick: openModal,
            },
          ]
        : []),
      ...(currentExternalIncident != null && !isEmpty(currentExternalIncident?.externalUrl)
        ? [
            {
              iconType: 'popout',
              label: i18n.VIEW_INCIDENT(currentExternalIncident?.externalTitle ?? ''),
              onClick: () => window.open(currentExternalIncident?.externalUrl, '_blank'),
            },
          ]
        : []),
    ],
    [permissions.delete, openModal, currentExternalIncident, caseData.id, showSuccessToast]
  );

  const onConfirmDeletion = useCallback(() => {
    setIsModalVisible(false);
    deleteCases(
      { caseIds: [caseData.id], successToasterTitle: i18n.DELETED_CASES(1) },
      { onSuccess: navigateToAllCases }
    );
  }, [caseData.id, deleteCases, navigateToAllCases]);

  if (propertyActions.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false} data-test-subj="case-view-actions">
      <PropertyActions propertyActions={propertyActions} />
      {isModalVisible ? (
        <ConfirmDeleteCaseModal
          totalCasesToBeDeleted={1}
          onCancel={closeModal}
          onConfirm={onConfirmDeletion}
        />
      ) : null}
    </EuiFlexItem>
  );
};
ActionsComponent.displayName = 'Actions';

export const Actions = React.memo(ActionsComponent);
