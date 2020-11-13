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

import * as i18n from '../../translations';

export interface CreateCaseModalProps {
  onCloseCaseModal: () => void;
}

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({ onCloseCaseModal }) => {
  return (
    <EuiOverlayMask data-test-subj="all-cases-modal">
      <EuiModal onClose={onCloseCaseModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.CREATE_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>{'test'}</EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
