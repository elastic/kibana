/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { css } from '@emotion/react';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  EuiHorizontalRule,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiComboBox,
  EuiPageHeader,
  EuiModal,
  EuiPanel,
  EuiPageHeaderSection,
  EuiTitle,
  useEuiTheme,
  useCurrentEuiBreakpoint,
  EuiFieldNumber,
  EuiSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiCheckbox,
  EuiButtonGroup,
  EuiButton,
  EuiFieldText,
} from '@elastic/eui';
import { ActionConnector, ActionTypeRegistryContract } from '@kbn/alerts-ui-shared';
import { RuleActionParam } from '@kbn/alerting-types';
import { getTimeOptions, useKibana } from '../../../../common';
import { useLoadRuleTypesQuery } from '../../../hooks/use_load_rule_types_query';
import { NotificationPolicyActionParams } from './notification_policy_action_params';
import { getActionReducer } from './action_reducer';
import { createPolicy } from '../../../lib/notification_api/create_policy';

interface ComboBoxFieldOption {
  key: string;
  label: string;
}

interface AlertCondition {
  conditionType?: ComboBoxFieldOption[];
  conditionValue?: ComboBoxFieldOption[];
  disabled?: boolean;
}

export interface NotificationPolicy {
  name: string;
  alertType: string[];
  connectors: Array<{ id: string; params: any }>;
  frequency: string;
  throttle?: string;
  conditions: Array<{ type: string; value: string[] }>;
}

export type NotificationPolicyWithId = NotificationPolicy & { id: string };

export interface CreateNotificationPolicyModalProps {
  connectors: ActionConnector[];
  connectorTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
}

export const CreateNotificationPolicyModal: React.FC<CreateNotificationPolicyModalProps> = ({
  connectors,
  connectorTypeRegistry,
  onClose,
}) => {
  const { http } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const actionReducer = useMemo(() => getActionReducer(), []);
  const [{ params: connectorParams }, dispatch] = useReducer(actionReducer, { params: {} });

  const setConnectorParamsProperty = useCallback(
    (key: string, value: RuleActionParam, connectorId: string) => {
      dispatch({
        command: { type: 'setNotificationActionParams' },
        payload: { key, value, connectorId },
      });
    },
    [dispatch]
  );

  const initializeConnectorParamsProperty = useCallback(
    (connectorId: string) => {
      dispatch({
        command: { type: 'initializeNotificationActionParams' },
        payload: { connectorId },
      });
    },
    [dispatch]
  );

  const [name, setName] = useState<string>('');
  const [selectedRunWhenOptions, setSelectedRunWhenOptions] = useState<ComboBoxFieldOption[]>([]);
  const [selectedConnectorsOptions, setSelectedConnectorsOptions] = useState<ComboBoxFieldOption[]>(
    []
  );
  const [selectedCadenceOptions, setSelectedCadenceOptions] = useState<ComboBoxFieldOption[]>([]);
  const [throttle, setThrottle] = useState<number | undefined>(1);
  const [throttleUnit, setThrottleUnit] = useState<string | undefined>('s');
  const [alertConditions, setAlertConditions] = useState<AlertCondition[]>([]);
  const [
    applyActiveActionGroupConditionToAllRuleTypes,
    setApplyActiveActionGroupConditionToAllRuleTypes,
  ] = useState<boolean>(false);
  const [
    applyRecoveredActionGroupConditionToAllRuleTypes,
    setApplyRecoveredActionGroupConditionToAllRuleTypes,
  ] = useState<boolean>(false);
  const [ruleTagsOptions, setRuleTagsOptions] = useState<ComboBoxFieldOption[]>([]);
  const [ruleNameOptions, setRuleNameOptions] = useState<ComboBoxFieldOption[]>([]);
  const [toggleSelectedConnector, setToggleSelectedConnector] = useState<string | undefined>();
  const [currentConnectorIndex, setCurrentConnectorIndex] = useState<number>(-1);

  const allAlertConditionsOptions = useMemo(() => {
    return [
      { label: 'alert action group is active for', key: 'active_action_group' },
      { label: 'alert action group is recovered for', key: 'recovered_action_group' },
      { label: 'rule tags match', key: 'tags' },
      { label: 'rule name matches', key: 'name' },
    ];
  }, []);
  const [alertConditionsOptions, setAlertConditionsOptions] =
    useState<ComboBoxFieldOption[]>(allAlertConditionsOptions);

  useEffect(() => {
    setAlertConditionsOptions(
      allAlertConditionsOptions.filter((option) => {
        return !alertConditions.some(
          (condition) => condition.conditionType?.[0].label === option.label
        );
      })
    );
  }, [alertConditions, allAlertConditionsOptions]);

  useEffect(() => {
    if (selectedConnectorsOptions.length > 0) {
      selectedConnectorsOptions.forEach((selectedConnectorOption) => {
        initializeConnectorParamsProperty(selectedConnectorOption.key!);
      });
      setCurrentConnectorIndex(
        connectors.findIndex((c) => c.id === selectedConnectorsOptions[0].key)
      );
      setToggleSelectedConnector(selectedConnectorsOptions[0].key);
    } else {
      setCurrentConnectorIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnectorsOptions]);

  const connectorsOptions = (connectors ?? []).map((connector) => ({
    label: connector.name,
    key: connector.id,
  }));

  const { authorizedRuleTypes } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });

  const alertConditionActionGroupOptions = useMemo(() => {
    return authorizedRuleTypes.map((ruleType) => ({
      label: `${ruleType.name} rule type`,
      key: ruleType.id,
    }));
  }, [authorizedRuleTypes]);

  const onSave = async () => {
    const policy = {
      name,
      alertType: selectedRunWhenOptions.map((option) => option.key),
      connectors: selectedConnectorsOptions.map((option) => ({
        id: option.key,
        params: connectorParams[option.key],
      })),
      frequency: selectedCadenceOptions?.[0].key,
      ...(selectedCadenceOptions?.[0].key === 'onThrottleInterval' && {
        throttle: `${throttle}${throttleUnit}`,
      }),
      conditions: alertConditions.map((condition) => {
        let value = (condition.conditionValue ?? []).map((c) => c.key ?? c.label);
        if (
          condition.conditionType![0].key === 'active_action_group' &&
          applyActiveActionGroupConditionToAllRuleTypes
        ) {
          value = ['all'];
        } else if (
          condition.conditionType![0].key === 'recovered_action_group' &&
          applyRecoveredActionGroupConditionToAllRuleTypes
        ) {
          value = ['all'];
        }
        return {
          type: condition.conditionType![0].key,
          value,
        };
      }),
    };
    await createPolicy({ http, policy });
    onClose();
  };

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={euiTheme.breakpoint[currentBreakpoint]}
      style={{
        width: euiTheme.breakpoint[currentBreakpoint],
        maxHeight: isFullscreenPortrait ? 'initial' : '960px',
        height: isFullscreenPortrait ? 'initial' : '80vh',
        overflow: isFullscreenPortrait ? 'auto' : 'hidden',
      }}
      data-test-subj="createNotificationPolicyModal"
    >
      <EuiPanel paddingSize="m" style={!isFullscreenPortrait ? { maxHeight: '100%' } : {}}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={0}>
            <EuiPageHeader bottomBorder="extended" paddingSize="m">
              <EuiPageHeaderSection style={{ width: '100%' }}>
                <EuiTitle size="s">
                  <h1>
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.createNotificationPolicyModal.title',
                      {
                        defaultMessage: 'Configure a new notification policy',
                      }
                    )}
                  </h1>
                </EuiTitle>
                <EuiSpacer size="m" />
              </EuiPageHeaderSection>
            </EuiPageHeader>
          </EuiFlexItem>
          <EuiFlexItem
            style={{
              overflow: 'hidden',
              marginTop: -euiTheme.size.base /* Offset extra padding for card hover drop shadow */,
            }}
          >
            <EuiFlexGroup>
              <EuiFlexItem grow={false} style={{ marginTop: '6px' }}>
                Name{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFieldText
                  compressed={true}
                  autoFocus={true}
                  name="name"
                  value={name || ''}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiHorizontalRule />
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false} style={{ marginTop: '6px' }}>
                Send{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiComboBox
                  compressed={true}
                  placeholder="select one or more notification types"
                  singleSelection={false}
                  // isInvalid={errors.termField.length > 0}
                  selectedOptions={selectedRunWhenOptions}
                  onChange={(
                    selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                  ) => {
                    setSelectedRunWhenOptions(selectedOptions);
                  }}
                  options={[
                    { label: 'summary of alerts', key: 'summary' },
                    { label: 'notification for each alert', key: 'per-alert' },
                  ]}
                />{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ marginTop: '6px' }}>
                to{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiComboBox
                  compressed={true}
                  placeholder="select one or more connectors"
                  singleSelection={false}
                  selectedOptions={selectedConnectorsOptions}
                  onChange={(
                    selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                  ) => {
                    setSelectedConnectorsOptions(selectedOptions);
                  }}
                  options={connectorsOptions}
                />{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ marginTop: '6px' }}>
                when{' '}
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: '250px' }}>
                <EuiComboBox
                  compressed={true}
                  placeholder="select a cadence"
                  singleSelection={{ asPlainText: true }}
                  selectedOptions={selectedCadenceOptions}
                  onChange={(
                    selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                  ) => {
                    setSelectedCadenceOptions(selectedOptions);
                  }}
                  options={[
                    { label: 'an alert is triggered', key: 'onActiveAlert' },
                    { label: 'an alert changes state', key: 'onActionGroupChange' },
                    { label: 'on a custom interval', key: 'onThrottleInterval' },
                  ]}
                />{' '}
              </EuiFlexItem>
              {selectedCadenceOptions[0]?.label === 'on a custom interval' && (
                <>
                  <EuiFlexItem grow={false} style={{ marginTop: '6px' }}>
                    of every{' '}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ width: '70px' }}>
                    <EuiFieldNumber
                      compressed={true}
                      min={1}
                      value={throttle ?? 1}
                      name="throttle"
                      data-test-subj="throttleInput"
                      onChange={(e) => {
                        pipe(
                          some(e.target.value.trim()),
                          filter((value) => value !== ''),
                          map((value) => parseInt(value, 10)),
                          filter((value) => !isNaN(value)),
                          map((value) => {
                            setThrottle(value);
                          })
                        );
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ minWidth: '100px' }}>
                    <EuiSelect
                      compressed={true}
                      data-test-subj="throttleUnitInput"
                      value={throttleUnit}
                      options={getTimeOptions(throttle ?? 1)}
                      onChange={(e) => {
                        setThrottleUnit(e.target.value);
                      }}
                    />
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem
                grow={false}
                css={css`
                  margin-top: 11px;
                `}
              >
                when alert matches all of the following condition(s){' '}
              </EuiFlexItem>
              {alertConditionsOptions.length > 0 && (
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={() => {
                    setAlertConditions([...alertConditions, {}]);
                  }}
                >
                  Add condition
                </EuiButtonEmpty>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {alertConditions.map((condition, index) => {
              return (
                <Fragment key={`condition${index}`}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} style={{ minWidth: '300px' }}>
                      <EuiComboBox
                        isClearable={false}
                        compressed={true}
                        singleSelection={{ asPlainText: true }}
                        selectedOptions={
                          condition.conditionType ? [condition.conditionType[0]] : []
                        }
                        onChange={(
                          selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                        ) => {
                          alertConditions[index].conditionType = selectedOptions;
                          setAlertConditions([...alertConditions]);
                        }}
                        options={alertConditionsOptions}
                      />{' '}
                    </EuiFlexItem>
                    {condition.conditionType?.[0]?.key === 'active_action_group' && (
                      <>
                        <EuiFlexItem grow={false} style={{ minWidth: '400px' }}>
                          <EuiComboBox
                            compressed={true}
                            placeholder={
                              applyActiveActionGroupConditionToAllRuleTypes ? `all rule types` : ''
                            }
                            singleSelection={false}
                            isDisabled={applyActiveActionGroupConditionToAllRuleTypes}
                            selectedOptions={condition.conditionValue ?? []}
                            onChange={(
                              selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                            ) => {
                              alertConditions[index].conditionValue = selectedOptions;
                              setAlertConditions([...alertConditions]);
                            }}
                            options={alertConditionActionGroupOptions}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem style={{ marginTop: '3px' }}>
                          <EuiCheckbox
                            id="applyActionGroupConditionToAllRuleTypes"
                            label="select all rule types"
                            checked={applyActiveActionGroupConditionToAllRuleTypes}
                            onChange={(e) => {
                              const newVal = !applyActiveActionGroupConditionToAllRuleTypes;
                              if (newVal === true) {
                                alertConditions[index].conditionValue = [];
                                setAlertConditions([...alertConditions]);
                              }
                              setApplyActiveActionGroupConditionToAllRuleTypes(
                                !applyActiveActionGroupConditionToAllRuleTypes
                              );
                            }}
                          />
                        </EuiFlexItem>
                      </>
                    )}
                    {condition.conditionType?.[0]?.key === 'recovered_action_group' && (
                      <>
                        <EuiFlexItem grow={false} style={{ minWidth: '400px' }}>
                          <EuiComboBox
                            compressed={true}
                            placeholder={
                              applyRecoveredActionGroupConditionToAllRuleTypes
                                ? `all rule types`
                                : ''
                            }
                            singleSelection={false}
                            isDisabled={applyRecoveredActionGroupConditionToAllRuleTypes}
                            selectedOptions={condition.conditionValue ?? []}
                            onChange={(
                              selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                            ) => {
                              alertConditions[index].conditionValue = selectedOptions;
                              setAlertConditions([...alertConditions]);
                            }}
                            options={alertConditionActionGroupOptions}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem style={{ marginTop: '3px' }}>
                          <EuiCheckbox
                            id="applyRecoveredActionGroupConditionToAllRuleTypes"
                            label="select all rule types"
                            checked={applyRecoveredActionGroupConditionToAllRuleTypes}
                            onChange={(e) => {
                              const newVal = !applyRecoveredActionGroupConditionToAllRuleTypes;
                              if (newVal === true) {
                                alertConditions[index].conditionValue = [];
                                setAlertConditions([...alertConditions]);
                              }
                              setApplyRecoveredActionGroupConditionToAllRuleTypes(
                                !applyRecoveredActionGroupConditionToAllRuleTypes
                              );
                            }}
                          />
                        </EuiFlexItem>
                      </>
                    )}
                    {condition.conditionType?.[0]?.key === 'tags' && (
                      <EuiFlexItem grow={false} style={{ minWidth: '400px' }}>
                        <EuiComboBox
                          compressed={true}
                          noSuggestions
                          singleSelection={false}
                          selectedOptions={condition.conditionValue ?? []}
                          onCreateOption={(searchValue: string) => {
                            const newOptions = [...ruleTagsOptions, { label: searchValue }];
                            alertConditions[index].conditionValue = newOptions;
                            setAlertConditions([...alertConditions]);
                            setRuleTagsOptions(newOptions);
                          }}
                          onChange={(
                            selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                          ) => {
                            alertConditions[index].conditionValue = selectedOptions;
                            setAlertConditions([...alertConditions]);
                            setRuleTagsOptions(selectedOptions);
                          }}
                        />
                      </EuiFlexItem>
                    )}
                    {condition.conditionType?.[0]?.key === 'name' && (
                      <EuiFlexItem grow={false} style={{ minWidth: '400px' }}>
                        <EuiComboBox
                          compressed={true}
                          noSuggestions
                          singleSelection={false}
                          selectedOptions={condition.conditionValue ?? []}
                          onCreateOption={(searchValue: string) => {
                            const newOptions = [...ruleNameOptions, { label: searchValue }];
                            alertConditions[index].conditionValue = newOptions;
                            setAlertConditions([...alertConditions]);
                            setRuleNameOptions(newOptions);
                          }}
                          onChange={(
                            selectedOptions: Array<EuiComboBoxOptionOption<ComboBoxFieldOption>>
                          ) => {
                            alertConditions[index].conditionValue = selectedOptions;
                            setAlertConditions([...alertConditions]);
                            setRuleNameOptions(selectedOptions);
                          }}
                        />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => {
                          alertConditions.splice(index, 1);
                          setAlertConditions([...alertConditions]);
                        }}
                        iconType="minusInCircle"
                        style={{ marginTop: '5px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                </Fragment>
              );
            })}
            <EuiHorizontalRule />
            <EuiButtonGroup
              legend="connector button group"
              options={selectedConnectorsOptions.map((connectorOption, index) => {
                const connector = connectors.find((c) => c.id === connectorOption.key)!;
                const connectorType = connectorTypeRegistry.get(connector.actionTypeId);
                return {
                  id: connector.id,
                  label: connector.name,
                  iconType: connectorType.iconClass,
                };
              })}
              idSelected={toggleSelectedConnector}
              onChange={(id: string) => {
                console.log(`toggleSelectedConnector ${id}`);
                setToggleSelectedConnector(id);
                setCurrentConnectorIndex(connectors.findIndex((c) => c.id === id)!);
              }}
            />
            {currentConnectorIndex > -1 && (
              <>
                <EuiHorizontalRule />
                <NotificationPolicyActionParams
                  index={currentConnectorIndex}
                  connector={connectors[currentConnectorIndex]}
                  connectorParams={connectorParams[connectors[currentConnectorIndex].id]}
                  connectorTypeRegistry={connectorTypeRegistry}
                  setConnectorParamsProperty={setConnectorParamsProperty}
                />
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="success"
              data-test-subj="saveRuleButton"
              type="submit"
              iconType="check"
              onClick={onSave}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiModal>
  );
};
