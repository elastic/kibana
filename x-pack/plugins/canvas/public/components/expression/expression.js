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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiRange,
  EuiToolTip,
} from '@elastic/eui';
import { Shortcuts } from 'react-shortcuts';
import { ExpressionInput } from '../expression_input';

const { useRef } = React;

const minFontSize = 12;
const maxFontSize = 32;

const shortcut = (ref, cmd, callback) => (
  <Shortcuts
    name="EXPRESSION"
    handler={(command, event) => {
      const isInputActive = ref.current && ref.current.ref === event.target;
      if (isInputActive && command === cmd) {
        callback();
      }
    }}
    targetNodeSelector="body"
    global
    stopPropagation
  />
);

export const Expression = ({
  functionDefinitions,
  formState,
  updateValue,
  setExpression,
  done,
  error,
  isAutocompleteEnabled,
  toggleAutocompleteEnabled,
  fontSize,
  setFontSize,
  isCompact,
  toggleCompactView,
}) => {
  const refExpressionInput = useRef(null);
  return (
    <EuiPanel
      className={`canvasTray__panel canvasExpression--${isCompact ? 'compactSize' : 'fullSize'}`}
    >
      {shortcut(refExpressionInput, 'RUN', () => {
        if (!error) {
          setExpression(formState.expression);
        }
      })}
      <ExpressionInput
        ref={refExpressionInput}
        fontSize={fontSize}
        isCompact={isCompact}
        functionDefinitions={functionDefinitions}
        error={error}
        value={formState.expression}
        onChange={updateValue}
        isAutocompleteEnabled={isAutocompleteEnabled}
      />
      <div className="canvasExpression--controls">
        <EuiToolTip content={isCompact ? 'Maximize' : 'Minimize'}>
          <EuiButtonIcon
            size="s"
            onClick={toggleCompactView}
            iconType="expand"
            color="subdued"
            aria-label="Toggle expression window height"
          />
        </EuiToolTip>
      </div>
      <EuiFlexGroup
        className="canvasExpression--settings"
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="l"
      >
        <EuiFlexItem grow={false}>
          <EuiSwitch
            id="autocompleteOptIn"
            name="popswitch"
            label="Enable autocomplete"
            checked={isAutocompleteEnabled}
            onChange={toggleAutocompleteEnabled}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem style={{ fontSize: `${minFontSize}px` }} grow={false}>
              A
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiRange
                value={fontSize}
                min={minFontSize}
                step={4}
                max={maxFontSize}
                onChange={e => setFontSize(e.target.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ fontSize: `${maxFontSize}px` }}>
              A
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color={formState.dirty ? 'danger' : 'primary'}
                onClick={done}
              >
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
