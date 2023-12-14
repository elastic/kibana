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
  EuiSwitch,
  EuiSwitchEvent,
  EuiFieldText,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { isString, debounce } from 'lodash';
import { ActionVariable } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import type { UserDefinedRuleParams } from '../types';
import { CodeEditorModal } from './code_editor_modal';
import { useTestUserDefinedRule } from './use_test_user_defined_rule';

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<UserDefinedRuleParams>
> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionVariableOptions, setActionVariableOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const { mutate: testRule, isLoading } = useTestUserDefinedRule({
    onSuccess: (data) => {
      setSuccess(JSON.stringify(data, null, 2));
    },
    onError: (data) => {
      setError(data.body.message);
    },
  });

  useEffect(() => {
    if (null == props.ruleParams.codeOrUrl) {
      props.setRuleParams('codeOrUrl', 'console.log("your code appears here!");');
    }
    if (null == props.ruleParams.isUrl) {
      props.setRuleParams('isUrl', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCodeOrUrlChange = useCallback(
    (codeOrUrl: string) => {
      props.setRuleParams('codeOrUrl', codeOrUrl.trim());
    },
    [props]
  );

  const onIsUrlChange = useCallback(
    (e: EuiSwitchEvent) => {
      props.setRuleParams('codeOrUrl', '');
      props.setRuleParams('isUrl', e.target.checked);
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

  const onTestRuleClick = useCallback(() => {
    setSuccess('');
    setError('');
    testRule({
      isUrl: props.ruleParams.isUrl,
      codeOrUrl: props.ruleParams.codeOrUrl,
      customContextVariables: props.ruleParams.customContextVariables,
    });
  }, [testRule, props]);

  const renderTestCodeResult = () => {
    if (isLoading) {
      return (
        <EuiFlexItem>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      );
    }
    if (success) {
      return (
        <EuiFlexItem>
          <EuiCallOut title="Your code looks good!" color="success" iconType="check">
            <EuiCodeBlock fontSize="m" paddingSize="m">
              {success}
            </EuiCodeBlock>
          </EuiCallOut>
        </EuiFlexItem>
      );
    }
    if (error) {
      return (
        <EuiFlexItem>
          <EuiCallOut
            title="Sorry, there was an error testing your code"
            color="danger"
            iconType="error"
          >
            <EuiCodeBlock fontSize="m" paddingSize="m">
              {error}
            </EuiCodeBlock>
          </EuiCallOut>
        </EuiFlexItem>
      );
    }
  };

  const renderButtons = () => {
    const hasError =
      (props.errors.customContextVariables as string[])?.length > 0 ||
      (props.errors.codeOrUrl as string[])?.length > 0;

    if (props.ruleParams.isUrl) {
      return (
        <EuiFlexItem>
          <EuiButton color="primary" onClick={onTestRuleClick} isDisabled={hasError}>
            Test run
          </EuiButton>
        </EuiFlexItem>
      );
    }
    return (
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton color="primary" onClick={() => setIsModalOpen(true)}>
              Edit code
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton color="primary" onClick={onTestRuleClick} isDisabled={hasError}>
              Test run
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.userDefined.ui.enterCode"
                defaultMessage="Define your own rule"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            data-test-subj="isUrlSwitch"
            label={i18n.translate('xpack.stackAlerts.userDefined.ui.isUrlLabel', {
              defaultMessage: 'Use URL',
            })}
            checked={props.ruleParams.isUrl}
            onChange={onIsUrlChange}
          />
        </EuiFlexItem>
        {props.ruleParams.isUrl ? (
          <>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.stackAlerts.userDefined.ui.urlLabel', {
                  defaultMessage: 'Use code at URL',
                })}
                isInvalid={!!(props.errors.codeOrUrl as string[])[0]}
                error={(props.errors.codeOrUrl as string[])[0]}
              >
                <EuiFieldText
                  fullWidth
                  placeholder="Url"
                  value={props.ruleParams.codeOrUrl}
                  onChange={(e) => onCodeOrUrlChange(e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </>
        ) : (
          <>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.stackAlerts.userDefined.ui.codeEditorLabel', {
                  defaultMessage: 'Code your rule',
                })}
                isInvalid={!!(props.errors.codeOrUrl as string[])[0]}
                error={(props.errors.codeOrUrl as string[])[0]}
              >
                <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m">
                  {props.ruleParams.codeOrUrl}
                </EuiCodeBlock>
              </EuiFormRow>
            </EuiFlexItem>
          </>
        )}
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
            isInvalid={(props.errors.customContextVariables as string[])?.length > 0}
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
        {renderTestCodeResult()}
        {renderButtons()}
      </EuiFlexGroup>
      <EuiSpacer />
      <CodeEditorModal
        isOpen={isModalOpen}
        code={props.ruleParams.codeOrUrl}
        onChange={onCodeOrUrlChange}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
