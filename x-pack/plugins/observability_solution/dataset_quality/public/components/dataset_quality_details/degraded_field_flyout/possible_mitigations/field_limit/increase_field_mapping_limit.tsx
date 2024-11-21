/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber,
} from '@elastic/eui';
import {
  fieldLimitMitigationApplyButtonText,
  fieldLimitMitigationCurrentLimitLabelText,
  fieldLimitMitigationNewLimitButtonText,
  fieldLimitMitigationNewLimitPlaceholderText,
} from '../../../../../../common/translations';
import { useDegradedFields } from '../../../../../hooks';

export function IncreaseFieldMappingLimit({ totalFieldLimit }: { totalFieldLimit: number }) {
  // Propose the user a 30% increase over the current limit
  const proposedNewLimit = Math.round(totalFieldLimit * 1.3);
  const [newFieldLimit, setNewFieldLimit] = useState<number>(proposedNewLimit);
  const [isInvalid, setIsInvalid] = useState(false);
  const { updateNewFieldLimit, isMitigationInProgress } = useDegradedFields();

  const validateNewLimit = (newLimit: string) => {
    const parsedLimit = parseInt(newLimit, 10);
    setNewFieldLimit(parsedLimit);
    if (totalFieldLimit > parsedLimit) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
    }
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      data-test-subj="datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel"
    >
      <EuiFlexItem>
        <EuiFormRow label={fieldLimitMitigationCurrentLimitLabelText}>
          <EuiFieldText
            data-test-subj="datasetQualityIncreaseFieldMappingCurrentLimitFieldText"
            disabled
            value={totalFieldLimit}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow label={fieldLimitMitigationNewLimitButtonText}>
          <EuiFieldNumber
            data-test-subj="datasetQualityIncreaseFieldMappingProposedLimitFieldText"
            placeholder={fieldLimitMitigationNewLimitPlaceholderText}
            value={newFieldLimit}
            onChange={(e) => validateNewLimit(e.target.value)}
            aria-label={fieldLimitMitigationNewLimitPlaceholderText}
            isInvalid={isInvalid}
            min={totalFieldLimit + 1}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton
            data-test-subj="datasetQualityIncreaseFieldMappingLimitButtonButton"
            disabled={isInvalid}
            onClick={() => updateNewFieldLimit(newFieldLimit)}
            isLoading={isMitigationInProgress}
          >
            {fieldLimitMitigationApplyButtonText}
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
