/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabs, EuiTab, EuiCallOut } from '@elastic/eui';
import { operationDefinitionMap } from '../operations';

export const formulaOperationName = 'formula';
export const staticValueOperationName = 'static_value';
export const quickFunctionsName = 'quickFunctions';
export const nonQuickFunctions = new Set([formulaOperationName, staticValueOperationName]);

export type TemporaryState = typeof quickFunctionsName | typeof staticValueOperationName | 'none';

export function isQuickFunction(operationType: string) {
  return !nonQuickFunctions.has(operationType);
}

export function getParamEditor(
  temporaryStaticValue: boolean,
  selectedOperationDefinition: typeof operationDefinitionMap[string] | undefined,
  showDefaultStaticValue: boolean
) {
  if (temporaryStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  if (selectedOperationDefinition?.paramEditor) {
    return selectedOperationDefinition.paramEditor;
  }
  if (showDefaultStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  return null;
}

export const CalloutWarning = ({
  currentOperationType,
  temporaryStateType,
}: {
  currentOperationType: keyof typeof operationDefinitionMap | undefined;
  temporaryStateType: TemporaryState;
}) => {
  if (
    temporaryStateType === 'none' ||
    (currentOperationType != null && isQuickFunction(currentOperationType))
  ) {
    return null;
  }
  if (
    currentOperationType === staticValueOperationName &&
    temporaryStateType === 'quickFunctions'
  ) {
    return (
      <>
        <EuiCallOut
          className="lnsIndexPatternDimensionEditor__warning"
          size="s"
          title={i18n.translate('xpack.lens.indexPattern.staticValueWarning', {
            defaultMessage: 'Static value currently applied',
          })}
          iconType="alert"
          color="warning"
        >
          <p>
            {i18n.translate('xpack.lens.indexPattern.staticValueWarningText', {
              defaultMessage: 'To overwrite your static value, select a quick function',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }
  return (
    <>
      <EuiCallOut
        className="lnsIndexPatternDimensionEditor__warning"
        size="s"
        title={i18n.translate('xpack.lens.indexPattern.formulaWarning', {
          defaultMessage: 'Formula currently applied',
        })}
        iconType="alert"
        color="warning"
      >
        {temporaryStateType !== 'quickFunctions' ? (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningStaticValueText', {
              defaultMessage: 'To overwrite your formula, change the value in the input field',
            })}
          </p>
        ) : (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningText', {
              defaultMessage: 'To overwrite your formula, select a quick function',
            })}
          </p>
        )}
      </EuiCallOut>
    </>
  );
};

export interface DimensionEditorTab {
  enabled: boolean;
  state: boolean;
  onClick: () => void;
  id: typeof quickFunctionsName | typeof staticValueOperationName | typeof formulaOperationName;
  label: string;
}

export const DimensionEditorTabs = ({ tabs }: { tabs: DimensionEditorTab[] }) => {
  return (
    <EuiTabs
      size="s"
      className="lnsIndexPatternDimensionEditor__header"
      data-test-subj="lens-dimensionTabs"
    >
      {tabs.map(({ id, enabled, state, onClick, label }) => {
        return enabled ? (
          <EuiTab
            key={id}
            isSelected={state}
            data-test-subj={`lens-dimensionTabs-${id}`}
            onClick={onClick}
          >
            {label}
          </EuiTab>
        ) : null;
      })}
    </EuiTabs>
  );
};
