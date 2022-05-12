/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EuiTextArea, EuiButton, EuiButtonEmpty, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromExpression, toExpression } from '@kbn/interpreter';

const strings = {
  getApplyButtonLabel: () =>
    i18n.translate('xpack.canvas.argFormAdvancedFailure.applyButtonLabel', {
      defaultMessage: 'Apply',
    }),
  getResetButtonLabel: () =>
    i18n.translate('xpack.canvas.argFormAdvancedFailure.resetButtonLabel', {
      defaultMessage: 'Reset',
    }),
  getRowErrorMessage: () =>
    i18n.translate('xpack.canvas.argFormAdvancedFailure.rowErrorMessage', {
      defaultMessage: 'Invalid Expression',
    }),
};

const isValid = (argExpression) => {
  try {
    fromExpression(argExpression, 'argument');
    return true;
  } catch (e) {
    return false;
  }
};

export const AdvancedFailure = (props) => {
  const { onValueChange, defaultValue, argValue, resetErrorState, argId } = props;

  const [argExpression, setArgExpression] = useState(toExpression(argValue, 'argument'));
  const [valid, setValid] = useState(isValid(argExpression));

  useEffect(() => {
    const argExpr = toExpression(argValue, 'argument');
    setArgExpression(argExpr);
    setValid(isValid(argExpr));
  }, [argValue]);

  const valueChange = (ev) => {
    ev.preventDefault();
    resetErrorState(); // when setting a new value, attempt to reset the error state
    if (valid) {
      return onValueChange(fromExpression(argExpression.trim(), 'argument'));
    }
  };

  const confirmReset = (ev) => {
    ev.preventDefault();
    resetErrorState(); // when setting a new value, attempt to reset the error state
    onValueChange(fromExpression(defaultValue, 'argument'));
  };

  return (
    <div>
      <EuiFormRow
        display="rowCompressed"
        id={argId}
        isInvalid={!valid}
        error={strings.getRowErrorMessage()}
      >
        <EuiTextArea
          id={argId}
          isInvalid={!valid}
          value={argExpression}
          compressed
          onChange={(ev) => setArgExpression(ev.target.value)}
          rows={3}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <div>
        <EuiButton disabled={!valid} onClick={(e) => valueChange(e)} size="s" type="submit">
          {strings.getApplyButtonLabel()}
        </EuiButton>
        {defaultValue && defaultValue.length && (
          <EuiButtonEmpty size="s" color="danger" onClick={confirmReset}>
            {strings.getResetButtonLabel()}
          </EuiButtonEmpty>
        )}
      </div>
      <EuiSpacer size="s" />
    </div>
  );
};

AdvancedFailure.propTypes = {
  defaultValue: PropTypes.string,
  onValueChange: PropTypes.func.isRequired,
  resetErrorState: PropTypes.func.isRequired,
  argId: PropTypes.string.isRequired,
  argValue: PropTypes.any.isRequired,
};
