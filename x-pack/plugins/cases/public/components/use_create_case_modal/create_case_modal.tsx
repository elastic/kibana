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
import { CaseType } from '../../../common/api';
import { getCreateCaseLazy as getCreateCase } from '../../methods';

export interface CreateCaseModalProps {
  caseType?: CaseType;
  hideConnectorServiceNowSir?: boolean;
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  owner: string;
}

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({
  caseType = CaseType.individual,
  hideConnectorServiceNowSir,
  isModalOpen,
  onCloseCaseModal,
  onSuccess,
  owner,
}) =>
  isModalOpen ? (
    <EuiModal onClose={onCloseCaseModal} data-test-subj="create-case-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CREATE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {getCreateCase({
          caseType,
          hideConnectorServiceNowSir,
          onCancel: onCloseCaseModal,
          onSuccess,
          withSteps: false,
          owner: [owner],
        })}
      </EuiModalBody>
    </EuiModal>
  ) : null;

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
