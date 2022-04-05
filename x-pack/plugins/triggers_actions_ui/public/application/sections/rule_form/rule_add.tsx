/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutBody,
  EuiPortal,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import {
  Rule,
  RuleTypeParams,
  RuleUpdates,
  RuleFlyoutCloseReason,
  IErrorObject,
  RuleAddProps,
  RuleTypeIndex,
  TriggersActionsUiConfig,
} from '../../../types';
import { RuleForm } from './rule_form';
import { RulePreview } from './rule_preview';
import { getRuleActionErrors, getRuleErrors, isValidRule } from './rule_errors';
import { ruleReducer, InitialRule, InitialRuleReducer } from './rule_reducer';
import { createRule, loadRuleTypes } from '../../lib/rule_api';
import { HealthCheck } from '../../components/health_check';
import { ConfirmRuleSave } from './confirm_rule_save';
import { ConfirmRuleClose } from './confirm_rule_close';
import { hasShowActionsCapability } from '../../lib/capabilities';
import RuleAddFooter from './rule_add_footer';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { hasRuleChanged, haveRuleParamsChanged } from './has_rule_changed';
import { getRuleWithInvalidatedFields } from '../../lib/value_validators';
import { DEFAULT_RULE_INTERVAL } from '../../constants';
import { triggersActionsUiConfig } from '../../../common/lib/config_api';
import { getInitialInterval } from './get_initial_interval';
import { PartialRule } from '../../lib/rule_api/diagnose';

const RuleAdd = ({
  consumer,
  ruleTypeRegistry,
  actionTypeRegistry,
  onClose,
  canChangeTrigger,
  ruleTypeId,
  initialValues,
  reloadRules,
  onSave,
  metadata,
  filteredSolutions,
  ...props
}: RuleAddProps) => {
  const onSaveHandler = onSave ?? reloadRules;

  const initialRule: InitialRule = useMemo(() => {
    return {
      params: {},
      consumer,
      ruleTypeId,
      schedule: {
        interval: DEFAULT_RULE_INTERVAL,
      },
      actions: [],
      tags: [],
      notifyWhen: 'onActionGroupChange',
      ...(initialValues ? initialValues : {}),
    };
  }, [ruleTypeId, consumer, initialValues]);

  const [{ rule }, dispatch] = useReducer(ruleReducer as InitialRuleReducer, {
    rule: initialRule,
  });
  const [config, setConfig] = useState<TriggersActionsUiConfig>({});
  const [initialRuleParams, setInitialRuleParams] = useState<RuleTypeParams>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConfirmRuleSaveModalOpen, setIsConfirmRuleSaveModalOpen] = useState<boolean>(false);
  const [isConfirmRuleCloseModalOpen, setIsConfirmRuleCloseModalOpen] = useState<boolean>(false);
  const [ruleTypeIndex, setRuleTypeIndex] = useState<RuleTypeIndex | undefined>(
    props.ruleTypeIndex
  );
  const [isPreviewFlyoutVisible, setIsPreviewFlyoutVisible] = useState<boolean>(true);
  const [changedFromDefaultInterval, setChangedFromDefaultInterval] = useState<boolean>(false);

  const setRule = (value: InitialRule) => {
    dispatch({ command: { type: 'setRule' }, payload: { key: 'rule', value } });
  };

  const setRuleProperty = <Key extends keyof Rule>(key: Key, value: Rule[Key] | null) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;

  const canShowActions = hasShowActionsCapability(capabilities);

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  useEffect(() => {
    if (ruleTypeId) {
      setRuleProperty('ruleTypeId', ruleTypeId);
    }
  }, [ruleTypeId]);

  useEffect(() => {
    if (!props.ruleTypeIndex) {
      (async () => {
        const ruleTypes = await loadRuleTypes({ http });
        const index: RuleTypeIndex = new Map();
        for (const ruleType of ruleTypes) {
          index.set(ruleType.id, ruleType);
        }
        setRuleTypeIndex(index);
      })();
    }
  }, [props.ruleTypeIndex, http]);

  useEffect(() => {
    if (isEmpty(rule.params) && !isEmpty(initialRuleParams)) {
      // rule params are explicitly cleared when the rule type is cleared.
      // clear the "initial" params in order to capture the
      // default when a new rule type is selected
      setInitialRuleParams({});
    } else if (isEmpty(initialRuleParams)) {
      // captures the first change to the rule params,
      // when consumers set a default value for the rule params
      setInitialRuleParams(rule.params);
    }
  }, [rule.params, initialRuleParams]);

  const [ruleActionsErrors, setRuleActionsErrors] = useState<IErrorObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await getRuleActionErrors(rule as Rule, actionTypeRegistry);
      setIsLoading(false);
      setRuleActionsErrors([...res]);
    })();
  }, [rule, actionTypeRegistry]);

  useEffect(() => {
    if (config.minimumScheduleInterval && !initialValues?.schedule?.interval) {
      setRuleProperty('schedule', {
        interval: getInitialInterval(config.minimumScheduleInterval.value),
      });
    }
  }, [config.minimumScheduleInterval, initialValues]);

  useEffect(() => {
    if (rule.ruleTypeId && ruleTypeIndex) {
      const type = ruleTypeIndex.get(rule.ruleTypeId);
      if (type?.defaultScheduleInterval && !changedFromDefaultInterval) {
        setRuleProperty('schedule', { interval: type.defaultScheduleInterval });
      }
    }
  }, [rule.ruleTypeId, ruleTypeIndex, rule.schedule.interval, changedFromDefaultInterval]);

  useEffect(() => {
    if (rule.schedule.interval !== DEFAULT_RULE_INTERVAL && !changedFromDefaultInterval) {
      setChangedFromDefaultInterval(true);
    }
  }, [rule.schedule.interval, changedFromDefaultInterval]);

  const checkForChangesAndCloseFlyout = () => {
    if (
      hasRuleChanged(rule, initialRule, false) ||
      haveRuleParamsChanged(rule.params, initialRuleParams)
    ) {
      setIsConfirmRuleCloseModalOpen(true);
    } else {
      onClose(RuleFlyoutCloseReason.CANCELED);
    }
  };

  const saveRuleAndCloseFlyout = async () => {
    const savedRule = await onSaveRule();
    setIsSaving(false);
    if (savedRule) {
      onClose(RuleFlyoutCloseReason.SAVED);
      if (onSaveHandler) {
        onSaveHandler();
      }
    }
  };

  const ruleType = rule.ruleTypeId ? ruleTypeRegistry.get(rule.ruleTypeId) : null;

  const { ruleBaseErrors, ruleErrors, ruleParamsErrors } = getRuleErrors(
    rule as Rule,
    ruleType,
    config
  );

  // Confirm before saving if user is able to add actions but hasn't added any to this rule
  const shouldConfirmSave = canShowActions && rule.actions?.length === 0;

  async function onSaveRule(): Promise<Rule | undefined> {
    try {
      const newRule = await createRule({ http, rule: rule as RuleUpdates });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.ruleAdd.saveSuccessNotificationText', {
          defaultMessage: 'Created rule "{ruleName}"',
          values: {
            ruleName: newRule.name,
          },
        })
      );
      return newRule;
    } catch (errorRes) {
      toasts.addDanger(
        errorRes.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.ruleAdd.saveErrorNotificationText', {
            defaultMessage: 'Cannot create rule.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={checkForChangesAndCloseFlyout}
        aria-labelledby="flyoutRuleAddTitle"
        size="m"
        maxWidth={isPreviewFlyoutVisible ? 1400 : 620}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addRuleFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create rule"
                id="xpack.triggersActionsUI.sections.ruleAdd.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthContextProvider>
          <HealthCheck inFlyout={true} waitForCheck={false}>
            <EuiFlyoutBody>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <RuleForm
                    rule={rule}
                    config={config}
                    dispatch={dispatch}
                    errors={ruleErrors}
                    canChangeTrigger={canChangeTrigger}
                    operation={i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleAdd.operationName',
                      {
                        defaultMessage: 'create',
                      }
                    )}
                    actionTypeRegistry={actionTypeRegistry}
                    ruleTypeRegistry={ruleTypeRegistry}
                    metadata={metadata}
                    filteredSolutions={filteredSolutions}
                    onShowPreview={() => {
                      setIsPreviewFlyoutVisible(true);
                    }}
                  />
                </EuiFlexItem>
                {isPreviewFlyoutVisible && (
                  <EuiFlexItem>
                    <RulePreview potentialRule={rule as PartialRule} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlyoutBody>
            <RuleAddFooter
              isSaving={isSaving}
              isFormLoading={isLoading}
              onSave={async () => {
                setIsSaving(true);
                if (isLoading || !isValidRule(rule, ruleErrors, ruleActionsErrors)) {
                  setRule(
                    getRuleWithInvalidatedFields(
                      rule as Rule,
                      ruleParamsErrors,
                      ruleBaseErrors,
                      ruleActionsErrors
                    )
                  );
                  setIsSaving(false);
                  return;
                }
                if (shouldConfirmSave) {
                  setIsConfirmRuleSaveModalOpen(true);
                } else {
                  await saveRuleAndCloseFlyout();
                }
              }}
              onCancel={checkForChangesAndCloseFlyout}
            />
          </HealthCheck>
        </HealthContextProvider>
        {isConfirmRuleSaveModalOpen && (
          <ConfirmRuleSave
            onConfirm={async () => {
              setIsConfirmRuleSaveModalOpen(false);
              await saveRuleAndCloseFlyout();
            }}
            onCancel={() => {
              setIsSaving(false);
              setIsConfirmRuleSaveModalOpen(false);
            }}
          />
        )}
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
export { RuleAdd as default };
