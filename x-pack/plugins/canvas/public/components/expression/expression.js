/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
} from '@elastic/eui';
import { ExpressionInput } from '../expression_input';

export const Expression = ({
  functionDefinitions,
  formState,
  updateValue,
  setExpression,
  done,
  error,
  isAutocompleteEnabled,
  toggleAutocompleteEnabled,
}) => {
  return (
    <EuiPanel>
      <ExpressionInput
        functionDefinitions={functionDefinitions}
        error={error}
        value={formState.expression}
        onChange={updateValue}
        isAutocompleteEnabled={isAutocompleteEnabled}
      />
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            id="autocompleteOptIn"
            name="popswitch"
            label="Enable autocomplete"
            checked={isAutocompleteEnabled}
            onChange={toggleAutocompleteEnabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiButtonEmpty size="s" color={formState.dirty ? 'danger' : 'primary'} onClick={done}>
              {formState.dirty ? 'Cancel' : 'Close'}
            </EuiButtonEmpty>
            <EuiButton
              fill
              disabled={!!error}
              onClick={() => setExpression(formState.expression)}
              size="s"
            >
              Run
            </EuiButton>
          </EuiFlexGroup>
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
  isAutocompleteEnabled: PropTypes.bool,
  toggleAutocompleteEnabled: PropTypes.func,
};
