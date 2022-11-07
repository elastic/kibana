/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';

import { bulkDuplicateRuleActions as i18n } from './translations';

interface BulkDuplicateExceptionsConfirmationProps {
  onCancel: () => void;
  onConfirm: (checked: boolean) => void;
}

const BulkActionDuplicateExceptionsConfirmationComponent = ({
  onCancel,
  onConfirm,
}: BulkDuplicateExceptionsConfirmationProps) => {
  const [shouldDuplicateExceptions, setShouldDuplicateExceptions] = useState(false);

  const handleCheckboxChange = useCallback(() => {
    setShouldDuplicateExceptions((checked) => !checked);
  }, [setShouldDuplicateExceptions]);

  const handleConfirm = useCallback(() => {
    onConfirm(shouldDuplicateExceptions);
  }, [onConfirm, shouldDuplicateExceptions]);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{i18n.MODAL_TITLE}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>{i18n.MODAL_TEXT}</EuiText>
        <EuiCheckbox
          id="duplicateExceptionsCheckbox"
          label={i18n.DUPLICATE_EXCEPTIONS_TEXT}
          checked={shouldDuplicateExceptions}
          onChange={handleCheckboxChange}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton onClick={onCancel} fill>
              {i18n.CANCEL_BUTTON}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={handleConfirm} fill>
              {i18n.CONTINUE_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const BulkActionDuplicateExceptionsConfirmation = React.memo(
  BulkActionDuplicateExceptionsConfirmationComponent
);

BulkActionDuplicateExceptionsConfirmation.displayName = 'BulkActionDuplicateExceptionsConfirmation';
