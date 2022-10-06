/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

import * as i18n from './translations';

interface ExceptionsFlyoutMetaComponentProps {
  exceptionItemName: string;
  onChange: (value: [string, string]) => void;
}

const ExceptionsFlyoutMetaComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  exceptionItemName,
  onChange,
}): JSX.Element => {
  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(['name', e.target.value]);
    },
    [onChange]
  );

  return (
    <EuiFormRow label={i18n.RULE_EXCEPTION_NAME_LABEL} data-test-subj="exceptionFlyoutName">
      <EuiFieldText
        placeholder={i18n.RULE_EXCEPTION_NAME_PLACEHOLDER}
        value={exceptionItemName}
        onChange={onNameChange}
        data-test-subj="exceptionFlyoutNameInput"
      />
    </EuiFormRow>
  );
};

export const ExceptionsFlyoutMeta = React.memo(ExceptionsFlyoutMetaComponent);

ExceptionsFlyoutMeta.displayName = 'ExceptionsFlyoutMeta';
