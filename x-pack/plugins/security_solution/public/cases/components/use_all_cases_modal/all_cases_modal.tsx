/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
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

export interface AllCasesModalProps {
  onCloseCaseModal: () => void;
  onRowClick: (id?: string) => void;
}

const AllCasesModalComponent: React.FC<AllCasesModalProps> = ({ onCloseCaseModal, onRowClick }) => {
  const userPermissions = useGetUserSavedObjectPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  return (
    <EuiOverlayMask data-test-subj="all-cases-modal">
      <EuiModal onClose={onCloseCaseModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <AllCases onRowClick={onRowClick} userCanCrud={userCanCrud} isModal />
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};

export const AllCasesModal = memo(AllCasesModalComponent);

AllCasesModal.displayName = 'AllCasesModal';
