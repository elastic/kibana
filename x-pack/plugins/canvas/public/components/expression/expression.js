/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiPanel, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExpressionInput } from '../expression_input';

export const Expression = ({
  functionDefinitions,
  formState,
  updateValue,
  setExpression,
  done,
  error,
}) => {
  return (
    <EuiPanel>
      <ExpressionInput
        functionDefinitions={functionDefinitions}
        error={error}
        value={formState.expression}
        onChange={updateValue}
      />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" color={formState.dirty ? 'danger' : 'primary'} onClick={done}>
            {formState.dirty ? 'Cancel' : 'Close'}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            disabled={!!error}
            onClick={() => setExpression(formState.expression)}
            size="s"
          >
            Run
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Expression.propTypes = {
  functionDefinitions: PropTypes.array,
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
  error: PropTypes.string,
};
