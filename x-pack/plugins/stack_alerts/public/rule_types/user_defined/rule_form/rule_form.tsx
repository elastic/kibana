/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiButton,
  EuiTitle,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { isString, debounce } from 'lodash';
import { ActionVariable } from '@kbn/alerting-types';
import type { UserDefinedRuleParams } from '../types';
import { CodeEditorModal } from './code_editor_modal';

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<UserDefinedRuleParams>
> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionVariableOptions, setActionVariableOptions] = useState<EuiComboBoxOptionOption[]>([]);

  useEffect(() => {
    if (null == props.ruleParams.stringifiedUserCode) {
      props.setRuleParams('stringifiedUserCode', 'console.log("your code appears here!");');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCodeChange = useCallback(
    (code: string) => {
      props.setRuleParams('stringifiedUserCode', code.trim());
    },
    [props]
  );

  const loadActionVariableOptions = debounce((search: string) => {
    setActionVariableOptions([{ label: search, value: search }]);
  }, 250);

  const onActionVariableChange = useCallback(
    (actionVariables: string[]) => {
      props.setRuleParams(
        'customContextVariables',
        actionVariables.map((av: string) => ({ name: av, description: av }))
      );
    },
    [props]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.userDefined.ui.enterCode"
                defaultMessage="Write your own rule"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            isInvalid={!!(props.errors.stringifiedUserCode as string[])[0]}
            error={(props.errors.stringifiedUserCode as string[])[0]}
          >
            <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m">
              {props.ruleParams.stringifiedUserCode}
            </EuiCodeBlock>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton color="primary" onClick={() => setIsModalOpen(true)}>
                Edit code
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton color="primary" disabled>
                Test run
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.userDefined.ui.contextVariables"
                defaultMessage="Add action variables"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiComboBox
            fullWidth
            async
            isInvalid={props.errors.customContextVariables?.length > 0}
            noSuggestions={!actionVariableOptions?.length}
            options={actionVariableOptions}
            data-test-subj="actionVariableComboBox"
            selectedOptions={(props.ruleParams.customContextVariables || []).map(
              (cv: ActionVariable) => {
                return {
                  label: cv.name,
                  value: cv.name,
                };
              }
            )}
            onChange={async (selected: EuiComboBoxOptionOption[]) => {
              const selectedActionVariables = selected
                .map((aSelected) => aSelected.value)
                .filter<string>(isString)
                .filter((selectedValueStr: string) => selectedValueStr.length > 0);
              onActionVariableChange(selectedActionVariables);
            }}
            onSearchChange={loadActionVariableOptions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <CodeEditorModal
        isOpen={isModalOpen}
        code={props.ruleParams.stringifiedUserCode}
        onChange={onCodeChange}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
