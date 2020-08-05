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
  EuiToolTip,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import { Shortcuts } from 'react-shortcuts';
import { ComponentStrings } from '../../../i18n';
import { ExpressionInput } from '../expression_input';
import { ToolTipShortcut } from '../tool_tip_shortcut';

const { Expression: strings } = ComponentStrings;

const { useRef } = React;

const shortcut = (ref, cmd, callback) => (
  <Shortcuts
    name="EXPRESSION"
    handler={(command) => {
      const isInputActive = ref.current && ref.current.editor && ref.current.editor.hasTextFocus();
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
  fontSize,
  isCompact,
  toggleCompactView,
}) => {
  const refExpressionInput = useRef(null);

  const handleRun = () => {
    setExpression(formState.expression);
    // If fullScreen and you hit run, toggle back down so you can see your work
    if (!isCompact && !error) {
      toggleCompactView();
    }
  };

  const expressionPanel = (
    <EuiPanel
      className={`canvasTray__panel canvasTray__panel--holdingExpression canvasExpression--${
        isCompact ? 'compactSize' : 'fullSize'
      }`}
      paddingSize="none"
    >
      {shortcut(refExpressionInput, 'RUN', () => {
        if (!error) {
          setExpression(formState.expression);
        }
      })}

      {/* Error code below is to pass a non breaking space so the editor does not jump */}

      <ExpressionInput
        ref={refExpressionInput}
        fontSize={fontSize}
        isCompact={isCompact}
        functionDefinitions={functionDefinitions}
        error={error ? error : `\u00A0`}
        value={formState.expression}
        onChange={updateValue}
      />
      <div className="canvasExpression__settings">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <span>
                      {strings.getRunTooltip()}{' '}
                      <ToolTipShortcut namespace="EXPRESSION" action="RUN" />
                    </span>
                  }
                >
                  <EuiButton fill disabled={!!error} onClick={handleRun} size="s">
                    {strings.getRunButtonLabel()}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color={formState.dirty ? 'danger' : 'primary'}
                  onClick={done}
                >
                  {formState.dirty ? strings.getCancelButtonLabel() : strings.getCloseButtonLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  href="https://www.elastic.co/guide/en/kibana/current/canvas-function-reference.html"
                  target="_blank"
                >
                  {strings.getLearnLinkText()}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="fullScreen" onClick={toggleCompactView} size="xs">
                  {isCompact ? strings.getMaximizeButtonLabel() : strings.getMinimizeButtonLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );

  if (isCompact) {
    return expressionPanel;
  } else {
    // Portal is required to show above the navigation
    return <EuiPortal>{expressionPanel}</EuiPortal>;
  }
};

Expression.propTypes = {
  functionDefinitions: PropTypes.array,
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
  error: PropTypes.string,
};
