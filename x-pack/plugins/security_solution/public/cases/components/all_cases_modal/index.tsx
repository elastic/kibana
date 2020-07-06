/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { useGetUserSavedObjectPermissions } from '../../../common/lib/kibana';
import { AllCases } from '../all_cases';
import * as i18n from './translations';

interface AllCasesModalProps {
  onCloseCaseModal: () => void;
  showCaseModal: boolean;
  onRowClick: (id: string) => void;
}

export const AllCasesModalComponent = ({
  onCloseCaseModal,
  onRowClick,
  showCaseModal,
}: AllCasesModalProps) => {
  const userPermissions = useGetUserSavedObjectPermissions();
  let modal;
  if (showCaseModal) {
    modal = (
      <EuiOverlayMask data-test-subj="all-cases-modal">
        <EuiModal onClose={onCloseCaseModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <AllCases
              onRowClick={onRowClick}
              userCanCrud={userPermissions?.crud ?? false}
              isModal
            />
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  return <>{modal}</>;
};

export const AllCasesModal = React.memo(AllCasesModalComponent);

AllCasesModal.displayName = 'AllCasesModal';
