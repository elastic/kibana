/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiPortal,
  EuiCallOut,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Rule,
  RuleFlyoutCloseReason,
  RuleEditProps,
  IErrorObject,
  RuleType,
  TriggersActionsUiConfig,
} from '../../../types';
import { RuleForm } from './rule_form';
import { getRuleActionErrors, getRuleErrors, isValidRule } from './rule_errors';
import { ruleReducer, ConcreteRuleReducer } from './rule_reducer';
import { updateRule, loadRuleTypes } from '../../lib/rule_api';
import { HealthCheck } from '../../components/health_check';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { ConfirmRuleClose } from './confirm_rule_close';
import { hasRuleChanged } from './has_rule_changed';
import { getRuleWithInvalidatedFields } from '../../lib/value_validators';
import { triggersActionsUiConfig } from '../../../common/lib/config_api';

export const RuleEdit = ({
  initialRule,
  onClose,
  reloadRules,
  onSave,
  ruleTypeRegistry,
  actionTypeRegistry,
  metadata,
  ...props
}: RuleEditProps) => {
  const onSaveHandler = onSave ?? reloadRules;
  const [{ rule }, dispatch] = useReducer(ruleReducer as ConcreteRuleReducer, {
    rule: cloneDeep(initialRule),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasActionsDisabled, setHasActionsDisabled] = useState<boolean>(false);
  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);
  const [isConfirmRuleCloseModalOpen, setIsConfirmRuleCloseModalOpen] = useState<boolean>(false);
  const [ruleActionsErrors, setRuleActionsErrors] = useState<IErrorObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverRuleType, setServerRuleType] = useState<RuleType<string, string> | undefined>(
    props.ruleType
  );
  const [config, setConfig] = useState<TriggersActionsUiConfig>({});

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setRule = (value: Rule) => {
    dispatch({ command: { type: 'setRule' }, payload: { key: 'rule', value } });
  };

  const ruleType = ruleTypeRegistry.get(rule.ruleTypeId);

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await getRuleActionErrors(rule as Rule, actionTypeRegistry);
      setRuleActionsErrors([...res]);
      setIsLoading(false);
    })();
  }, [rule, actionTypeRegistry]);

  useEffect(() => {
    if (!props.ruleType && !serverRuleType) {
      (async () => {
        const serverRuleTypes = await loadRuleTypes({ http });
        for (const _serverRuleType of serverRuleTypes) {
          if (ruleType.id === _serverRuleType.id) {
            setServerRuleType(_serverRuleType);
          }
        }
      })();
    }
  }, [props.ruleType, ruleType.id, serverRuleType, http]);

  const { ruleBaseErrors, ruleErrors, ruleParamsErrors } = getRuleErrors(
    rule as Rule,
    ruleType,
    config
  );

  const checkForChangesAndCloseFlyout = () => {
    if (hasRuleChanged(rule, initialRule, true)) {
      setIsConfirmRuleCloseModalOpen(true);
    } else {
      onClose(RuleFlyoutCloseReason.CANCELED);
    }
  };

  async function onSaveRule(): Promise<Rule | undefined> {
    try {
      if (
        !isLoading &&
        isValidRule(rule, ruleErrors, ruleActionsErrors) &&
        !hasActionsWithBrokenConnector
      ) {
        const newRule = await updateRule({ http, rule, id: rule.id });
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.ruleEdit.saveSuccessNotificationText', {
            defaultMessage: "Updated '{ruleName}'",
            values: {
              ruleName: newRule.name,
            },
          })
        );
        return newRule;
      } else {
        setRule(
          getRuleWithInvalidatedFields(rule, ruleParamsErrors, ruleBaseErrors, ruleActionsErrors)
        );
      }
    } catch (errorRes) {
      toasts.addDanger(
        errorRes.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.ruleEdit.saveErrorNotificationText', {
            defaultMessage: 'Cannot update rule.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={checkForChangesAndCloseFlyout}
        aria-labelledby="flyoutRuleEditTitle"
        size="m"
        maxWidth={620}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="editRuleFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Edit rule"
                id="xpack.triggersActionsUI.sections.ruleEdit.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthContextProvider>
          <HealthCheck inFlyout={true} waitForCheck={true}>
            <EuiFlyoutBody>
              {hasActionsDisabled && (
                <>
                  <EuiCallOut
                    size="s"
                    color="danger"
                    iconType="rule"
                    data-test-subj="hasActionsDisabled"
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleEdit.disabledActionsWarningTitle',
                      { defaultMessage: 'This rule has actions that are disabled' }
                    )}
                  />
                  <EuiSpacer />
                </>
              )}
              <RuleForm
                rule={rule}
                config={config}
                dispatch={dispatch}
                errors={ruleErrors}
                actionTypeRegistry={actionTypeRegistry}
                ruleTypeRegistry={ruleTypeRegistry}
                canChangeTrigger={false}
                setHasActionsDisabled={setHasActionsDisabled}
                setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
                operation="i18n.translate('xpack.triggersActionsUI.sections.ruleEdit.operationName', {
                  defaultMessage: 'edit',
                })"
                metadata={metadata}
              />
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="cancelSaveEditedRuleButton"
                    onClick={() => checkForChangesAndCloseFlyout()}
                  >
                    {i18n.translate('xpack.triggersActionsUI.sections.ruleEdit.cancelButtonLabel', {
                      defaultMessage: 'Cancel',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {isLoading ? (
                  <EuiFlexItem grow={false}>
                    <EuiSpacer size="s" />
                    <EuiLoadingSpinner size="l" />
                  </EuiFlexItem>
                ) : (
                  <></>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="success"
                    data-test-subj="saveEditedRuleButton"
                    type="submit"
                    iconType="check"
                    isLoading={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      const savedRule = await onSaveRule();
                      setIsSaving(false);
                      if (savedRule) {
                        onClose(RuleFlyoutCloseReason.SAVED);
                        if (onSaveHandler) {
                          onSaveHandler();
                        }
                      }
                    }}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleEdit.saveButtonLabel"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </HealthCheck>
        </HealthContextProvider>
        {isConfirmRuleCloseModalOpen && (
          <ConfirmRuleClose
            onConfirm={() => {
              setIsConfirmRuleCloseModalOpen(false);
              onClose(RuleFlyoutCloseReason.CANCELED);
            }}
            onCancel={() => {
              setIsConfirmRuleCloseModalOpen(false);
            }}
          />
        )}
      </EuiFlyout>
    </EuiPortal>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleEdit as default };
