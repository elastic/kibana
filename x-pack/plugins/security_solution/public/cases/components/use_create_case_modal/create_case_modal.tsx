/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';

import { Case } from '../../containers/types';
import * as i18n from '../../translations';
import { CaseType } from '../../../../../cases/common';
import { useKibana } from '../../../common/lib/kibana';

export interface CreateCaseModalProps {
  caseType?: CaseType;
  hideConnectorServiceNowSir?: boolean;
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
}

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({
  isModalOpen,
  onCloseCaseModal,
  onSuccess,
  caseType = CaseType.individual,
  hideConnectorServiceNowSir = false,
}) => {
  const { cases } = useKibana().services;
  return isModalOpen ? (
    <EuiModal onClose={onCloseCaseModal} data-test-subj="all-cases-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CREATE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {/* TODO: STEPH TEST THIS*/}
        {cases.getCreateCase({
          caseType,
          onCancel: onCloseCaseModal,
          onSuccess,
          hideConnectorServiceNowSir,
          withSteps: false,
        })}
      </EuiModalBody>
    </EuiModal>
  ) : null;
};

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
