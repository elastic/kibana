/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FormEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiCheckbox,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface ModalProps {
  closeModal: () => void;
  onSubmit: () => void;
}

export const ConfirmTrustSetupModal = ({ closeModal, onSubmit }: ModalProps) => {
  const [hasSetupTrust, setHasSetupTrust] = useState<boolean>(false);
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });
  const checkBoxId = useGeneratedHtmlId({ prefix: 'checkBoxId' });

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    closeModal();
    onSubmit();
  };

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.modal.title"
            defaultMessage="Confirm your configuration"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.clusterWizard.trustStep.body"
              defaultMessage="Have you setup an authentication mechanism to securely connect your remote cluster?"
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiForm id={modalFormId} component="form" onSubmit={onFormSubmit}>
          <EuiFormRow>
            <EuiCheckbox
              id={checkBoxId}
              label={i18n.translate('xpack.remoteClusters.clusterWizard.trustStep.modal.checkbox', {
                defaultMessage: 'Yes, I have setup trust',
              })}
              checked={hasSetupTrust}
              onChange={() => setHasSetupTrust(!hasSetupTrust)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.modal.cancelButton"
            defaultMessage="No, go back"
          />
        </EuiButtonEmpty>

        <EuiButton type="submit" form={modalFormId} fill disabled={!hasSetupTrust}>
          <FormattedMessage
            id="xpack.remoteClusters.clusterWizard.trustStep.modal.createCluster"
            defaultMessage="Create remote cluster"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
