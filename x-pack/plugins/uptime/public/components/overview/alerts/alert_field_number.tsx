/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldNumber } from '@elastic/eui';

interface AlertFieldNumberProps {
  'aria-label': string;
  'data-test-subj': string;
  disabled: boolean;
  fieldValue: number;
  setFieldValue: React.Dispatch<React.SetStateAction<number>>;
}

export const handleAlertFieldNumberChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  isInvalid: boolean,
  setIsInvalid: React.Dispatch<React.SetStateAction<boolean>>,
  setFieldValue: React.Dispatch<React.SetStateAction<number>>
) => {
  const num = parseInt(e.target.value, 10);
  if (isNaN(num) || num < 1) {
    setIsInvalid(true);
  } else {
    if (isInvalid) setIsInvalid(false);
    setFieldValue(num);
  }
};

export const AlertFieldNumber = ({
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  disabled,
  fieldValue,
  setFieldValue,
}: AlertFieldNumberProps) => {
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  return (
    <EuiFieldNumber
      aria-label={ariaLabel}
      compressed
      data-test-subj={dataTestSubj}
      min={1}
      onChange={(e) => handleAlertFieldNumberChange(e, isInvalid, setIsInvalid, setFieldValue)}
      disabled={disabled}
      value={fieldValue}
      isInvalid={isInvalid}
    />
  );
};
