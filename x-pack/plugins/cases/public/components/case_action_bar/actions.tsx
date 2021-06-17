/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';
import * as i18n from '../case_view/translations';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { PropertyActions } from '../property_actions';
import { Case } from '../../../common';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { CasesNavigation } from '../links';

interface CaseViewActions {
  allCasesNavigation: CasesNavigation;
  caseData: Case;
  currentExternalIncident: CaseService | null;
  disabled?: boolean;
}

const ActionsComponent: React.FC<CaseViewActions> = ({
  allCasesNavigation,
  caseData,
  currentExternalIncident,
  disabled = false,
}) => {
  // Delete case
  const {
    handleToggleModal,
    handleOnDeleteConfirm,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  const propertyActions = useMemo(
    () => [
      {
        disabled,
        iconType: 'trash',
        label: i18n.DELETE_CASE(),
        onClick: handleToggleModal,
      },
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
    [disabled, handleToggleModal, currentExternalIncident]
  );

  if (isDeleted) {
    allCasesNavigation.onClick(null);
    return null;
  }
  return (
    <>
      <PropertyActions propertyActions={propertyActions} />
      <ConfirmDeleteCaseModal
        caseTitle={caseData.title}
        isModalVisible={isDisplayConfirmDeleteModal}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(null, [
          { id: caseData.id, title: caseData.title, type: caseData.type },
        ])}
      />
    </>
  );
};

export const Actions = React.memo(ActionsComponent);
