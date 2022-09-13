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
import { EuiCallOut, EuiButtonGroup, EuiFormRow } from '@elastic/eui';
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

export interface DimensionEditorGroupsOptions {
  enabled: boolean;
  state: boolean;
  onClick: () => void;
  id: typeof quickFunctionsName | typeof staticValueOperationName | typeof formulaOperationName;
  label: string;
}

export const DimensionEditorButtonGroups = ({
  options,
  onMethodChange,
  selectedMethod,
}: {
  options: DimensionEditorGroupsOptions[];
  onMethodChange: (id: string) => void;
  selectedMethod: string;
}) => {
  const enabledGroups = options.filter(({ enabled }) => enabled);
  const groups = enabledGroups.map(({ id, label }) => {
    return {
      id,
      label,
      'data-test-subj': `lens-dimensionTabs-${id}`,
    };
  });

  const onChange = (optionId: string) => {
    onMethodChange(optionId);
    const selectedOption = options.find(({ id }) => id === optionId);
    selectedOption?.onClick();
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingMethod', {
        defaultMessage: 'Method',
      })}
      fullWidth
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.indexPattern.dimensionEditorModes', {
          defaultMessage: 'Dimension editor configuration modes',
        })}
        buttonSize="compressed"
        isFullWidth
        options={groups}
        idSelected={selectedMethod}
        onChange={(id) => onChange(id)}
      />
    </EuiFormRow>
  );
};
