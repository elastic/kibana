/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo, useReducer } from 'react';
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiResizableContainer,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiButton,
  EuiPageHeader,
  EuiSuperUpdateButton,
  EuiFlexGroup,
} from '@elastic/eui';
import { RuleAction, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_EXECUTION_UUID, ALERT_STATUS } from '@kbn/rule-data-utils';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import { triggersActionsUiConfig } from '../../../../common/lib/config_api';
import {
  TriggersActionsUiConfig,
  RuleTypeIndex,
  Rule,
  RuleTypeRegistryContract,
  ActionTypeRegistryContract,
  IErrorObject,
  RuleUpdates,
  RuleTypeModel,
  AlertsTableConfigurationRegistry,
  ActionConnector,
  ActionTypeIndex,
} from '../../../../types';
import {
  loadActionTypes,
  loadAllActions as loadConnectors,
} from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';
import { InitialRule, InitialRuleReducer, ruleReducer } from '../../rule_form/rule_reducer';
import { DEFAULT_RULE_INTERVAL } from '../../../constants';
import { RuleForm } from '../../rule_form/rule_form';
import { getRuleActionErrors, getRuleErrors, isValidRule } from '../../rule_form/rule_errors';
import { createRule } from '../../../lib/rule_api/create';
import { getInitialInterval } from '../../rule_form/get_initial_interval';
import { loadRuleTypes } from '../../../lib/rule_api/rule_types';
import { getRuleWithInvalidatedFields } from '../../../lib/value_validators';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { previewRule } from '../../../lib/rule_api/preview';
import AlertsTableState from '../../alerts_table/alerts_table_state';
import { TypeRegistry } from '../../../type_registry';
import { ActionTypePreview } from '../../action_connector_form/action_type_preview';

interface CreateRuleFormProps<MetaData = Record<string, any>> {
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Rule>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  hideInterval?: boolean;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
  filteredRuleTypes?: string[];
}

export const CreateRuleForm = ({
  consumer,
  ruleTypeRegistry,
  actionTypeRegistry,
  canChangeTrigger,
  ruleTypeId,
  initialValues,
  reloadRules,
  onSave,
  hideInterval,
  metadata,
  filteredRuleTypes,
  ...props
}: CreateRuleFormProps) => {
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
      ...(initialValues ? initialValues : {}),
    };
  }, [ruleTypeId, consumer, initialValues]);

  const [showSaveButton, setShowSaveButton] = useState<boolean>(false);
  const [{ rule }, dispatch] = useReducer(ruleReducer as InitialRuleReducer, {
    rule: initialRule,
  });
  const [config, setConfig] = useState<TriggersActionsUiConfig>({ isUsingSecurity: false });
  const [initialRuleParams, setInitialRuleParams] = useState<RuleTypeParams>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [ruleTypeIndex, setRuleTypeIndex] = useState<RuleTypeIndex | undefined>(
    props.ruleTypeIndex
  );
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [changedFromDefaultInterval, setChangedFromDefaultInterval] = useState<boolean>(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [hasPreviewAlertData, setHasPreviewAlertData] = useState<boolean>(false);
  const [previewActionData, setPreviewActionData] = useState<RuleAction[]>([]);
  const [alertsTableQuery, setAlertsTableQuery] = useState<any>(null);
  const setRule = (value: InitialRule) => {
    dispatch({ command: { type: 'setRule' }, payload: { key: 'rule', value } });
  };

  const setRuleProperty = <Key extends keyof Rule>(key: Key, value: Rule[Key] | null) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const {
    http,
    alertsTableConfigurationRegistry,
    notifications: { toasts },
    application: { navigateToApp },
  } = useKibana().services;

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  // load connector types
  useEffect(() => {
    (async () => {
      try {
        const registeredActionTypes = (
          await loadActionTypes({ http, featureId: AlertingConnectorFeatureId })
        ).sort((a, b) => a.name.localeCompare(b.name));
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of registeredActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load connector types' }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load connectors
  useEffect(() => {
    (async () => {
      try {
        const loadedConnectors = await loadConnectors({ http });
        setConnectors(loadedConnectors.filter((connector) => !connector.isMissingSecrets));
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadActionsMessage',
            {
              defaultMessage: 'Unable to load connectors',
            }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const res = await getRuleActionErrors(rule.actions, actionTypeRegistry);
      setIsLoading(false);
      setRuleActionsErrors([...res]);
    })();
  }, [rule.actions, actionTypeRegistry]);

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

  const ruleType = rule.ruleTypeId ? ruleTypeRegistry.get(rule.ruleTypeId) : null;

  const { ruleBaseErrors, ruleErrors, ruleParamsErrors } = useMemo(
    () => getRuleErrors(rule as Rule, ruleType, config),
    [rule, ruleType, config]
  );

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
      navigateToApp(`management/insightsAndAlerting/triggersActions`);
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
    <>
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            return (
              <>
                <EuiResizablePanel initialSize={70} minSize={'40%'} mode="main">
                  <EuiPageHeader bottomBorder pageTitle="Create new rule" />
                  <EuiSpacer size="xl" />
                  <RuleForm
                    rule={rule}
                    config={config}
                    dispatch={dispatch}
                    errors={ruleErrors}
                    canChangeTrigger={true}
                    operation={i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleAdd.operationName',
                      {
                        defaultMessage: 'create',
                      }
                    )}
                    actionTypeRegistry={actionTypeRegistry}
                    ruleTypeRegistry={ruleTypeRegistry}
                    filteredRuleTypes={[]}
                    onChangeMetaData={() => {}}
                    onSelectRuleType={(type: RuleTypeModel | null) => {
                      setShowSaveButton(type != null);
                    }}
                  />
                  {showSaveButton ? (
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiSpacer size="s" />
                        <div>
                          <EuiButton
                            fill
                            color="success"
                            data-test-subj="saveRuleButton"
                            type="submit"
                            iconType="check"
                            isDisabled={false}
                            isLoading={isSaving}
                            onClick={async () => {
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
                              await onSaveRule();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.triggersActionsUI.sections.ruleAddFooter.saveButtonLabel"
                              defaultMessage="Save"
                            />
                          </EuiButton>
                        </div>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : null}
                </EuiResizablePanel>

                <EuiResizableButton />

                <EuiResizablePanel
                  id={'preview'}
                  mode="collapsible"
                  initialSize={30}
                  minSize={'20%'}
                >
                  <EuiTitle size="m">
                    <h2>Rule preview</h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText color="subdued">
                    <p>
                      Preview the alerts that would be detected with the current configuration of
                      your rule.
                    </p>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiSuperUpdateButton
                    isDisabled={!isValidRule(rule, ruleErrors, ruleActionsErrors)}
                    iconType="refresh"
                    onClick={async () => {
                      setIsLoadingPreview(true);
                      const result = await previewRule({ http, rule: rule as RuleUpdates });

                      if (result.alerts.length > 0) {
                        setHasPreviewAlertData(true);
                        setAlertsTableQuery({
                          bool: {
                            filter: [
                              {
                                term: {
                                  [ALERT_RULE_EXECUTION_UUID]: result.uuid,
                                },
                              },
                              {
                                bool: {
                                  must_not: [
                                    {
                                      term: {
                                        [ALERT_STATUS]: 'preview-complete',
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        });
                      } else {
                        setHasPreviewAlertData(false);
                      }

                      setPreviewActionData(result.actions ?? []);
                      setIsLoadingPreview(false);
                    }}
                    color="primary"
                    fill={true}
                    data-test-subj="previewSubmitButton"
                  />
                  {isLoadingPreview ? <CenterJustifiedSpinner /> : null}
                  {hasPreviewAlertData && alertsTableQuery ? (
                    <>
                      <AlertsTableState
                        id={'preview'}
                        configurationId={'preview'}
                        alertsTableConfigurationRegistry={
                          alertsTableConfigurationRegistry as TypeRegistry<AlertsTableConfigurationRegistry>
                        }
                        featureIds={['alerts']}
                        showExpandToDetails={true}
                        query={alertsTableQuery}
                      />
                      <EuiSpacer size="m" />
                    </>
                  ) : null}
                  {actionTypesIndex && previewActionData.length > 0 ? (
                    <>
                      <EuiTitle size="s">
                        <h3>Action preview</h3>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiText color="subdued">
                        <p>The following notifications would have been sent</p>
                      </EuiText>
                      <EuiSpacer size="m" />
                      {previewActionData.map((previewAction: RuleAction, index: number) => {
                        const actionConnector = connectors.find(
                          (field) => field.id === previewAction.id
                        );

                        return (
                          <ActionTypePreview
                            actionItem={previewAction}
                            actionConnector={actionConnector!}
                            index={index}
                            key={`action-preview-action-at-${index}`}
                            actionTypesIndex={actionTypesIndex}
                            connectors={connectors}
                            actionTypeRegistry={actionTypeRegistry}
                          />
                        );
                      })}
                    </>
                  ) : null}
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </EuiPageTemplate.Section>
    </>
  );
};
