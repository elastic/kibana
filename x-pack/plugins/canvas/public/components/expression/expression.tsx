/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useRef } from 'react';
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
import { i18n } from '@kbn/i18n';

// @ts-expect-error
import { Shortcuts } from 'react-shortcuts';

import { ExpressionInputEditorRef } from 'src/plugins/presentation_util/public';
import { ExpressionInput } from '../expression_input';
import { ToolTipShortcut } from '../tool_tip_shortcut';
import { ExpressionFunction } from '../../../types';
import { FormState } from './';

const strings = {
  getCancelButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getCloseButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.closeButtonLabel', {
      defaultMessage: 'Close',
    }),
  getLearnLinkText: () =>
    i18n.translate('xpack.canvas.expression.learnLinkText', {
      defaultMessage: 'Learn expression syntax',
    }),
  getMaximizeButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.maximizeButtonLabel', {
      defaultMessage: 'Maximize editor',
    }),
  getMinimizeButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.minimizeButtonLabel', {
      defaultMessage: 'Minimize Editor',
    }),
  getRunButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.runButtonLabel', {
      defaultMessage: 'Run',
    }),
  getRunTooltip: () =>
    i18n.translate('xpack.canvas.expression.runTooltip', {
      defaultMessage: 'Run the expression',
    }),
};

const shortcut = (ref: ExpressionInputEditorRef, cmd: string, callback: () => void) => (
  <Shortcuts
    name="EXPRESSION"
    handler={(command: string) => {
      const isInputActive = ref.current && ref.current && ref.current.hasTextFocus();
      if (isInputActive && command === cmd) {
        callback();
      }
    }}
    targetNodeSelector="body"
    global
    stopPropagation
  />
);

interface Props {
  functionDefinitions: ExpressionFunction[];
  formState: FormState;
  updateValue: (expression?: string) => void;
  setExpression: (expression: string) => void;
  done: () => void;
  error?: string;
  isCompact: boolean;
  toggleCompactView: () => void;
}

export const Expression: FC<Props> = ({
  functionDefinitions,
  formState,
  updateValue,
  setExpression,
  done,
  error,
  isCompact,
  toggleCompactView,
}) => {
  const refExpressionInput: ExpressionInputEditorRef = useRef(null);

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
        isCompact={isCompact}
        expressionFunctions={functionDefinitions}
        error={error ? error : `\u00A0`}
        expression={formState.expression}
        onChange={updateValue}
        editorRef={refExpressionInput}
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
                <EuiButtonEmpty iconType="fullScreen" onClick={toggleCompactView} size="s">
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
