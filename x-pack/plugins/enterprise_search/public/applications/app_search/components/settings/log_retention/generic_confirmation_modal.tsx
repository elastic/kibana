/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

interface GenericConfirmationModalProps {
  description: ReactNode;
  subheading: ReactNode;
  target: string;
  title: string;
  onClose(): void;
  onSave(): void;
}

export const GenericConfirmationModal: React.FC<GenericConfirmationModalProps> = ({
  description,
  onClose,
  onSave,
  subheading,
  target,
  title,
}) => {
  const [inputValue, setInputValue] = useState('');

  const onConfirm = () => {
    setInputValue('');
    onSave();
  };

  return (
    <EuiModal onClose={onClose} initialFocus=".euiFieldText" aria-label={title}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            <strong>{subheading}</strong>
          </p>
          <p>{description}</p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.prompt',
            {
              defaultMessage: 'Type "{target}" to confirm.',
              values: { target },
            }
          )}
        >
          <EuiFieldText
            data-test-subj="GenericConfirmationModalInput"
            name="engineName"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="GenericConfirmationModalCancel" onClick={onClose}>
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.modal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="GenericConfirmationModalSave"
          onClick={onConfirm}
          disabled={inputValue !== target}
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.modal.save', {
            defaultMessage: 'Save setting',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
