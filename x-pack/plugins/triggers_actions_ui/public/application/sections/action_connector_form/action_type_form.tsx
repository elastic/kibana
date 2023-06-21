/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiFormRow,
  EuiAccordion,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiIconTip,
  EuiText,
  EuiFormLabel,
  EuiSuperSelect,
  EuiBadge,
  EuiErrorBoundary,
  EuiToolTip,
  EuiBetaBadge,
  EuiSplitPanel,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { isEmpty, partition, some } from 'lodash';
import {
  ActionVariable,
  RuleActionAlertsFilterProperty,
  RuleActionParam,
  RuleNotifyWhenType,
} from '@kbn/alerting-plugin/common';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  parseDuration,
} from '@kbn/alerting-plugin/common/parse_duration';
import { betaBadgeProps } from './beta_badge_props';
import {
  IErrorObject,
  RuleAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
  ActionConnectorMode,
  NotifyWhenSelectOptions,
} from '../../../types';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps, ActionGroupWithMessageVariables } from './action_form';
import { transformActionVariables } from '../../lib/action_variables';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorsSelection } from './connectors_selection';
import { ActionNotifyWhen } from './action_notify_when';
import { validateParamsForWarnings } from '../../lib/validate_params_for_warnings';
import { ActionAlertsFilterTimeframe } from './action_alerts_filter_timeframe';
import { ActionAlertsFilterQuery } from './action_alerts_filter_query';

export type ActionTypeFormProps = {
  actionItem: RuleAction;
  actionConnector: ActionConnector;
  index: number;
  onAddConnector: () => void;
  onConnectorSelected: (id: string) => void;
  onDeleteAction: () => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  setActionFrequencyProperty: (key: string, value: RuleActionParam, index: number) => void;
  setActionAlertsFilterProperty: (
    key: string,
    value: RuleActionAlertsFilterProperty,
    index: number
  ) => void;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  actionTypeRegistry: ActionTypeRegistryContract;
  recoveryActionGroup?: string;
  isActionGroupDisabledForActionType?: (actionGroupId: string, actionTypeId: string) => boolean;
  hideNotifyWhen?: boolean;
  hasSummary?: boolean;
  minimumThrottleInterval?: [number | undefined, string];
  notifyWhenSelectOptions?: NotifyWhenSelectOptions[];
  defaultNotifyWhenValue?: RuleNotifyWhenType;
  showActionAlertsFilter?: boolean;
} & Pick<
  ActionAccordionFormProps,
  | 'defaultActionGroupId'
  | 'actionGroups'
  | 'setActionGroupIdByIndex'
  | 'setActionParamsProperty'
  | 'messageVariables'
  | 'summaryMessageVariables'
  | 'defaultActionMessage'
  | 'defaultSummaryMessage'
>;

const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

export const ActionTypeForm = ({
  actionItem,
  actionConnector,
  index,
  onAddConnector,
  onConnectorSelected,
  onDeleteAction,
  setActionParamsProperty,
  setActionFrequencyProperty,
  setActionAlertsFilterProperty,
  actionTypesIndex,
  connectors,
  defaultActionGroupId,
  defaultActionMessage,
  messageVariables,
  summaryMessageVariables,
  actionGroups,
  setActionGroupIdByIndex,
  actionTypeRegistry,
  isActionGroupDisabledForActionType,
  recoveryActionGroup,
  hideNotifyWhen = false,
  defaultSummaryMessage,
  hasSummary,
  minimumThrottleInterval,
  notifyWhenSelectOptions,
  defaultNotifyWhenValue,
  showActionAlertsFilter,
}: ActionTypeFormProps) => {
  const {
    application: { capabilities },
    http: { basePath },
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);
  const defaultActionGroup = actionGroups?.find(({ id }) => id === defaultActionGroupId);
  const selectedActionGroup =
    actionGroups?.find(({ id }) => id === actionItem.group) ?? defaultActionGroup;
  const [actionGroup, setActionGroup] = useState<string>();
  const [actionParamsErrors, setActionParamsErrors] = useState<{ errors: IErrorObject }>({
    errors: {},
  });
  const [actionThrottle, setActionThrottle] = useState<number | null>(
    actionItem.frequency?.throttle
      ? getDurationNumberInItsUnit(actionItem.frequency.throttle)
      : null
  );
  const [actionThrottleUnit, setActionThrottleUnit] = useState<string>(
    actionItem.frequency?.throttle ? getDurationUnitValue(actionItem.frequency?.throttle) : 'h'
  );
  const [minimumActionThrottle = -1, minimumActionThrottleUnit] = minimumThrottleInterval ?? [
    -1,
    's',
  ];
  const [warning, setWarning] = useState<string | null>(null);

  const [useDefaultMessage, setUseDefaultMessage] = useState(false);

  const isSummaryAction = actionItem.frequency?.summary;

  const getDefaultParams = async () => {
    const connectorType = await actionTypeRegistry.get(actionItem.actionTypeId);
    let defaultParams;
    if (actionItem.group === recoveryActionGroup) {
      defaultParams = connectorType.defaultRecoveredActionParams;
    }

    if (!defaultParams) {
      defaultParams = connectorType.defaultActionParams;
    }

    return defaultParams;
  };

  const [showMinimumThrottleWarning, showMinimumThrottleUnitWarning] = useMemo(() => {
    try {
      if (!actionThrottle) return [false, false];
      const throttleUnitDuration = parseDuration(`1${actionThrottleUnit}`);
      const minThrottleUnitDuration = parseDuration(`1${minimumActionThrottleUnit}`);
      const boundedThrottle =
        throttleUnitDuration > minThrottleUnitDuration
          ? actionThrottle
          : Math.max(actionThrottle, minimumActionThrottle);
      const boundedThrottleUnit =
        parseDuration(`${actionThrottle}${actionThrottleUnit}`) >= minThrottleUnitDuration
          ? actionThrottleUnit
          : minimumActionThrottleUnit;
      return [boundedThrottle !== actionThrottle, boundedThrottleUnit !== actionThrottleUnit];
    } catch (e) {
      return [false, false];
    }
  }, [minimumActionThrottle, minimumActionThrottleUnit, actionThrottle, actionThrottleUnit]);

  useEffect(() => {
    (async () => {
      setAvailableActionVariables(
        messageVariables
          ? getAvailableActionVariables(
              messageVariables,
              summaryMessageVariables,
              selectedActionGroup,
              isSummaryAction
            )
          : []
      );

      const defaultParams = await getDefaultParams();
      if (defaultParams) {
        for (const [key, paramValue] of Object.entries(defaultParams)) {
          if (actionItem.params[key] === undefined || actionItem.params[key] === null) {
            setActionParamsProperty(key, paramValue, index);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.group, actionItem.frequency?.summary]);

  useEffect(() => {
    (async () => {
      const defaultParams = await getDefaultParams();
      if (defaultParams && actionGroup) {
        for (const [key, paramValue] of Object.entries(defaultParams)) {
          setActionParamsProperty(key, paramValue, index);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionGroup]);

  useEffect(() => {
    (async () => {
      const res: { errors: IErrorObject } = await actionTypeRegistry
        .get(actionItem.actionTypeId)
        ?.validateParams(actionItem.params);
      setActionParamsErrors(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem]);

  const canSave = hasSaveActionsCapability(capabilities);

  const actionGroupDisplay = (
    actionGroupId: string,
    actionGroupName: string,
    actionTypeId: string
  ): string =>
    isActionGroupDisabledForActionType
      ? isActionGroupDisabledForActionType(actionGroupId, actionTypeId)
        ? i18n.translate(
            'xpack.triggersActionsUI.sections.actionTypeForm.addNewActionConnectorActionGroup.display',
            {
              defaultMessage: '{actionGroupName} (Not Currently Supported)',
              values: { actionGroupName },
            }
          )
        : actionGroupName
      : actionGroupName;

  const isActionGroupDisabled = (actionGroupId: string, actionTypeId: string): boolean =>
    isActionGroupDisabledForActionType
      ? isActionGroupDisabledForActionType(actionGroupId, actionTypeId)
      : false;

  const actionNotifyWhen = (
    <ActionNotifyWhen
      frequency={actionItem.frequency}
      throttle={actionThrottle}
      throttleUnit={actionThrottleUnit}
      hasSummary={hasSummary}
      onNotifyWhenChange={useCallback(
        (notifyWhen) => {
          setActionFrequencyProperty('notifyWhen', notifyWhen, index);
        },
        [setActionFrequencyProperty, index]
      )}
      onThrottleChange={useCallback(
        (throttle: number | null, throttleUnit: string) => {
          if (throttle) {
            setActionThrottle(throttle);
            setActionThrottleUnit(throttleUnit);
          }
          setActionFrequencyProperty(
            'throttle',
            throttle ? `${throttle}${throttleUnit}` : null,
            index
          );
        },
        [setActionFrequencyProperty, index]
      )}
      onSummaryChange={useCallback(
        (summary: boolean) => {
          // use the default message when a user toggles between action frequencies
          setUseDefaultMessage(true);
          setActionFrequencyProperty('summary', summary, index);
        },
        [setActionFrequencyProperty, index]
      )}
      showMinimumThrottleWarning={showMinimumThrottleWarning}
      showMinimumThrottleUnitWarning={showMinimumThrottleUnitWarning}
      notifyWhenSelectOptions={notifyWhenSelectOptions}
      defaultNotifyWhenValue={defaultNotifyWhenValue}
    />
  );

  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;
  const allowGroupConnector = (actionTypeRegistered?.subtype ?? []).map((atr) => atr.id);

  const showActionGroupErrorIcon = (): boolean => {
    return !isOpen && some(actionParamsErrors.errors, (error) => !isEmpty(error));
  };

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    connectors.filter((connector) => connector.isPreconfigured)
  );

  const showSelectActionGroup =
    actionGroups &&
    selectedActionGroup &&
    setActionGroupIdByIndex &&
    !actionItem.frequency?.summary;

  const accordionContent = checkEnabledResult.isEnabled ? (
    <>
      <EuiSplitPanel.Inner
        color="subdued"
        style={{ borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionTypeForm.actionIdLabel"
              defaultMessage="{connectorInstance} connector"
              values={{
                connectorInstance: actionTypesIndex
                  ? actionTypesIndex[actionConnector.actionTypeId].name
                  : actionConnector.actionTypeId,
              }}
            />
          }
          labelAppend={
            canSave &&
            actionTypesIndex &&
            actionTypesIndex[actionConnector.actionTypeId].enabledInConfig ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj={`addNewActionConnectorButton-${actionItem.actionTypeId}`}
                onClick={onAddConnector}
              >
                <FormattedMessage
                  defaultMessage="Add connector"
                  id="xpack.triggersActionsUI.sections.actionTypeForm.addNewConnectorEmptyButton"
                />
              </EuiButtonEmpty>
            ) : null
          }
        >
          <ConnectorsSelection
            allowGroupConnector={allowGroupConnector}
            actionItem={actionItem}
            accordionIndex={index}
            actionTypesIndex={actionTypesIndex}
            actionTypeRegistered={actionTypeRegistered}
            connectors={connectors}
            onConnectorSelected={onConnectorSelected}
          />
        </EuiFormRow>
        <EuiSpacer size="xl" />
        {!hideNotifyWhen && actionNotifyWhen}
        {showSelectActionGroup && (
          <>
            {!hideNotifyWhen && <EuiSpacer size="s" />}
            <EuiSuperSelect
              prepend={
                <EuiFormLabel
                  htmlFor={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionTypeForm.actionRunWhenInActionGroup"
                    defaultMessage="Run when"
                  />
                </EuiFormLabel>
              }
              fullWidth
              id={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}
              data-test-subj={`addNewActionConnectorActionGroup-${index}`}
              options={actionGroups.map(({ id: value, name }) => ({
                value,
                inputDisplay: actionGroupDisplay(value, name, actionItem.actionTypeId),
                disabled: isActionGroupDisabled(value, actionItem.actionTypeId),
                'data-test-subj': `addNewActionConnectorActionGroup-${index}-option-${value}`,
              }))}
              valueOfSelected={selectedActionGroup.id}
              onChange={(group) => {
                setActionGroupIdByIndex(group, index);
                setActionGroup(group);
              }}
            />
          </>
        )}
        {showActionAlertsFilter && (
          <>
            {!hideNotifyWhen && <EuiSpacer size="xl" />}
            <ActionAlertsFilterQuery
              state={actionItem.alertsFilter?.query}
              onChange={(query) => setActionAlertsFilterProperty('query', query, index)}
            />
            <EuiSpacer size="s" />
            <ActionAlertsFilterTimeframe
              state={actionItem.alertsFilter?.timeframe}
              onChange={(timeframe) => setActionAlertsFilterProperty('timeframe', timeframe, index)}
            />
          </>
        )}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="plain">
        {ParamsFieldsComponent ? (
          <EuiErrorBoundary>
            <Suspense fallback={null}>
              <ParamsFieldsComponent
                actionParams={actionItem.params as any}
                index={index}
                errors={actionParamsErrors.errors}
                editAction={(key: string, value: RuleActionParam, i: number) => {
                  setWarning(
                    validateParamsForWarnings(
                      value,
                      basePath.publicBaseUrl,
                      availableActionVariables
                    )
                  );
                  setActionParamsProperty(key, value, i);
                }}
                messageVariables={availableActionVariables}
                defaultMessage={
                  // if action is a summary action, show the default summary message
                  isSummaryAction
                    ? defaultSummaryMessage
                    : selectedActionGroup?.defaultActionMessage ?? defaultActionMessage
                }
                useDefaultMessage={useDefaultMessage}
                actionConnector={actionConnector}
                executionMode={ActionConnectorMode.ActionForm}
              />
              {warning ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut size="s" color="warning" title={warning} />
                </>
              ) : null}
            </Suspense>
          </EuiErrorBoundary>
        ) : null}
      </EuiSplitPanel.Inner>
    </>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <>
      <EuiSplitPanel.Outer hasShadow={isOpen}>
        <EuiAccordion
          initialIsOpen={true}
          key={index}
          id={index.toString()}
          onToggle={setIsOpen}
          paddingSize="none"
          className="actAccordionActionForm"
          buttonContentClassName="actAccordionActionForm__button"
          data-test-subj={`alertActionAccordion-${index}`}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {showActionGroupErrorIcon() ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.triggersActionsUI.sections.actionTypeForm.actionErrorToolTip',
                      { defaultMessage: 'Action contains errors.' }
                    )}
                  >
                    <EuiIcon
                      data-test-subj="action-group-error-icon"
                      type="warning"
                      color="danger"
                      size="m"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText>
                  <div>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          defaultMessage="{actionConnectorName}"
                          id="xpack.triggersActionsUI.sections.actionTypeForm.existingAlertActionTypeEditTitle"
                          values={{
                            actionConnectorName: `${actionConnector.name} ${
                              actionConnector.isPreconfigured ? preconfiguredMessage : ''
                            }`,
                          }}
                        />
                      </EuiFlexItem>
                      {(selectedActionGroup || actionItem.frequency?.summary) && !isOpen && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge iconType="clock">
                            {actionItem.frequency?.summary
                              ? i18n.translate(
                                  'xpack.triggersActionsUI.sections.actionTypeForm.summaryGroupTitle',
                                  {
                                    defaultMessage: 'Summary of alerts',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.triggersActionsUI.sections.actionTypeForm.runWhenGroupTitle',
                                  {
                                    defaultMessage: 'Run when {groupName}',
                                    values: {
                                      groupName: selectedActionGroup!.name.toLocaleLowerCase(),
                                    },
                                  }
                                )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                      {warning && !isOpen && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            data-test-subj="warning-badge"
                            iconType="warning"
                            color="warning"
                          >
                            {i18n.translate(
                              'xpack.triggersActionsUI.sections.actionTypeForm.actionWarningsTitle',
                              {
                                defaultMessage: '1 warning',
                              }
                            )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem grow={false}>
                        {checkEnabledResult.isEnabled === false && (
                          <>
                            <EuiIconTip
                              type="warning"
                              color="danger"
                              content={i18n.translate(
                                'xpack.triggersActionsUI.sections.actionTypeForm.actionDisabledTitle',
                                {
                                  defaultMessage: 'This action is disabled',
                                }
                              )}
                              position="right"
                            />
                          </>
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiText>
              </EuiFlexItem>
              {actionTypeRegistered && actionTypeRegistered.isExperimental && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    data-test-subj="action-type-form-beta-badge"
                    label={betaBadgeProps.label}
                    tooltipContent={betaBadgeProps.tooltipContent}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          extraAction={
            <EuiButtonIcon
              iconType="minusInCircle"
              color="danger"
              className="actAccordionActionForm__extraAction"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.actionTypeForm.accordion.deleteIconAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={onDeleteAction}
            />
          }
        >
          {accordionContent}
        </EuiAccordion>
      </EuiSplitPanel.Outer>
      <EuiSpacer size="l" />
    </>
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables,
  summaryActionVariables?: ActionVariables,
  actionGroup?: ActionGroupWithMessageVariables,
  isSummaryAction?: boolean
) {
  const transformedActionVariables: ActionVariable[] = transformActionVariables(
    actionVariables,
    summaryActionVariables,
    actionGroup?.omitMessageVariables,
    isSummaryAction
  );

  // partition deprecated items so they show up last
  const partitionedActionVariables = partition(
    transformedActionVariables,
    (v) => v.deprecated !== true
  );
  return partitionedActionVariables.reduce((acc, curr) => {
    return [
      ...acc,
      ...curr.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase())),
    ];
  }, []);
}
