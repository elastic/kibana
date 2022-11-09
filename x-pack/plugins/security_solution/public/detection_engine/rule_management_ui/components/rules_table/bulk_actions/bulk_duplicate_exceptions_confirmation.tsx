/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiRadioGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { DUPLICATE_OPTIONS } from '../../../../../../common/constants';

import { bulkDuplicateRuleActions as i18n } from './translations';

interface BulkDuplicateExceptionsConfirmationProps {
  onCancel: () => void;
  onConfirm: (s: string) => void;
  rulesCount: number;
}

const BulkActionDuplicateExceptionsConfirmationComponent = ({
  onCancel,
  onConfirm,
  rulesCount,
}: BulkDuplicateExceptionsConfirmationProps) => {
  const [selectedDuplicateOption, setSelectedDuplicateOption] = useState(
    DUPLICATE_OPTIONS.WITH_EXCEPTIONS
  );

  const handleRadioChange = useCallback(
    (optionId) => {
      setSelectedDuplicateOption(optionId);
    },
    [setSelectedDuplicateOption]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selectedDuplicateOption);
  }, [onConfirm, selectedDuplicateOption]);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{i18n.MODAL_TITLE}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>{i18n.MODAL_TEXT(rulesCount)}</EuiText>
        <EuiRadioGroup
          options={[
            {
              id: DUPLICATE_OPTIONS.WITH_EXCEPTIONS,
              label: i18n.DUPLICATE_EXCEPTIONS_TEXT,
            },
            {
              id: DUPLICATE_OPTIONS.WITHOUT_EXCEPTIONS,
              label: i18n.DUPLICATE_WITHOUT_EXCEPTIONS_TEXT,
            },
          ]}
          idSelected={selectedDuplicateOption}
          onChange={handleRadioChange}
          // name="radio group"
          // legend={{
          //   children: <span>This is a legend for a radio group</span>,
          // }}
        />

        {/* <EuiCheckbox
          id="duplicateExceptionsCheckbox"
          label={i18n.DUPLICATE_EXCEPTIONS_TEXT}
          checked={shouldDuplicateExceptions}
          onChange={handleCheckboxChange}
        /> */}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton onClick={onCancel} fill>
              {i18n.CANCEL_BUTTON}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={handleConfirm} data-test-subj="confirmDuplicate" fill>
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
