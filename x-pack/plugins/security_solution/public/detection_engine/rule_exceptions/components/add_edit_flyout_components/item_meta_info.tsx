/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

import type { Action } from './reducer';
import * as i18n from './translations';

interface ExceptionsFlyoutMetaComponentProps {
  exceptionItemName: string;
  dispatch: React.Dispatch<Action>;
}

const ExceptionsFlyoutMetaComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  exceptionItemName,
  dispatch,
}): JSX.Element => {
  /**
   * Reducer action dispatchers
   * */
  const setExceptionItemMeta = useCallback(
    (value: [string, string]): void => {
      dispatch({
        type: 'setExceptionItemMeta',
        value,
      });
    },
    [dispatch]
  );

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExceptionItemMeta(['name', e.target.value]);
    },
    [setExceptionItemMeta]
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
