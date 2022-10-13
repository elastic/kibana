/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';

import { Case } from '../../containers/types';
import * as i18n from '../../common/translations';
import { CreateCase } from '../create';

export interface CreateCaseModalProps {
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
}

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({
  isModalOpen,
  onCloseCaseModal,
  onSuccess,
}) =>
  isModalOpen ? (
    <EuiModal onClose={onCloseCaseModal} data-test-subj="create-case-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CREATE_CASE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <CreateCase onCancel={onCloseCaseModal} onSuccess={onSuccess} withSteps={false} />
      </EuiModalBody>
    </EuiModal>
  ) : null;
CreateModalComponent.displayName = 'CreateModal';

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
