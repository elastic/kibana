/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps, withPropsOnChange } from 'recompose';
import { EuiTextArea, EuiButton, EuiButtonEmpty, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';

import { ComponentStrings } from '../../../i18n';

const { ArgFormAdvancedFailure: strings } = ComponentStrings;

export const AdvancedFailureComponent = (props) => {
  const {
    onValueChange,
    defaultValue,
    argExpression,
    updateArgExpression,
    resetErrorState,
    valid,
    argId,
  } = props;

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
          onChange={updateArgExpression}
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

AdvancedFailureComponent.propTypes = {
  defaultValue: PropTypes.string,
  onValueChange: PropTypes.func.isRequired,
  argExpression: PropTypes.string.isRequired,
  updateArgExpression: PropTypes.func.isRequired,
  resetErrorState: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired,
  argId: PropTypes.string.isRequired,
};

export const AdvancedFailure = compose(
  withProps(({ argValue }) => ({
    argExpression: toExpression(argValue, 'argument'),
  })),
  createStatefulPropHoc('argExpression', 'updateArgExpression'),
  withPropsOnChange(['argExpression'], ({ argExpression }) => ({
    valid: (function () {
      try {
        fromExpression(argExpression, 'argument');
        return true;
      } catch (e) {
        return false;
      }
    })(),
  }))
)(AdvancedFailureComponent);

AdvancedFailure.propTypes = {
  argValue: PropTypes.any.isRequired,
};
