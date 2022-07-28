/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiErrorBoundary,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiSelect,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty, some, partition } from 'lodash';
import {
  ActionVariable,
  NotifyWhen,
  RuleActionParam,
  SummaryOf,
  ThrottleUnit,
} from '@kbn/alerting-plugin/common';
import { showSummaryOption } from '../../lib/show_summary_option';
import {
  IErrorObject,
  RuleAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
} from '../../../types';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps, ActionGroupWithMessageVariables } from './action_form';
import { transformActionVariables } from '../../lib/action_variables';
import { useKibana } from '../../../common/lib/kibana';
import { DefaultActionParams } from '../../lib/get_defaults_for_action_params';
import { ConnectorsSelection } from './connectors_selection';

export type ActionTypeFormProps = {
  actionItem: RuleAction;
  actionConnector: ActionConnector;
  index: number;
  onAddConnector: () => void;
  onConnectorSelected: (id: string) => void;
  onDeleteAction: () => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  actionTypeRegistry: ActionTypeRegistryContract;
  defaultParams: DefaultActionParams;
  isActionGroupDisabledForActionType?: (actionGroupId: string, actionTypeId: string) => boolean;
  setActionProperty: <Key extends keyof RuleAction>(
    key: keyof RuleAction,
    value: RuleAction[Key],
    index: number
  ) => void;
} & Pick<
  ActionAccordionFormProps,
  | 'defaultActionGroupId'
  | 'actionGroups'
  | 'setActionGroupIdByIndex'
  | 'setActionParamsProperty'
  | 'messageVariables'
  | 'defaultActionMessage'
  | 'defaultSummaryActionMessage'
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
  actionTypesIndex,
  connectors,
  defaultActionGroupId,
  defaultActionMessage,
  defaultSummaryActionMessage,
  messageVariables,
  actionGroups,
  setActionGroupIdByIndex,
  actionTypeRegistry,
  isActionGroupDisabledForActionType,
  defaultParams,
  setActionProperty,
}: ActionTypeFormProps) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const [isOpen, setIsOpen] = useState(true);
  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);
  const defaultActionGroup = actionGroups?.find(({ id }) => id === defaultActionGroupId);
  const selectedActionGroup =
    actionGroups?.find(({ id }) => id === actionItem.group) ?? defaultActionGroup;
  const [actionGroup, setActionGroup] = useState<string>();
  const [actionParamsErrors, setActionParamsErrors] = useState<{ errors: IErrorObject }>({
    errors: {},
  });
  const [isSummary, setIsSummary] = useState<RuleAction['isSummary']>(
    Boolean(actionItem.params.isSummary) || false
  );
  const [summaryOf, setSummaryOf] = useState<RuleAction['summaryOf']>(
    actionItem.summaryOf || SummaryOf.TIME_SPAN
  );
  const [notifyWhen, setNotifyWhen] = useState<RuleAction['notifyWhen']>(
    actionItem.notifyWhen || NotifyWhen.ONCE
  );
  const [actionThrottle, setActionThrottle] = useState<RuleAction['actionThrottle']>(
    actionItem.actionThrottle || 1
  );
  const [actionThrottleUnit, setActionThrottleUnit] = useState<RuleAction['actionThrottleUnit']>(
    actionItem.actionThrottleUnit || ThrottleUnit.HOUR
  );

  useEffect(() => {
    setAvailableActionVariables(
      messageVariables ? getAvailableActionVariables(messageVariables, selectedActionGroup) : []
    );
    if (defaultParams) {
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        if (actionItem.params[key] === undefined || actionItem.params[key] === null) {
          setActionParamsProperty(key, paramValue, index);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.group]);

  useEffect(() => {
    if (defaultParams && actionGroup) {
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        setActionParamsProperty(key, paramValue, index);
      }
    }
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

  useEffect(() => {
    setActionProperty('isSummary', isSummary, index);
    if (isSummary && notifyWhen === NotifyWhen.ON_EVERY_RUN) {
      setNotifyWhen(NotifyWhen.ONCE);
    }
    setActionProperty('notifyWhen', notifyWhen, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSummary, notifyWhen]);

  useEffect(() => {
    setActionProperty('actionThrottleUnit', actionThrottleUnit, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionThrottleUnit]);

  useEffect(() => {
    setActionProperty('actionThrottle', actionThrottle, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionThrottle]);

  useEffect(() => {
    setActionProperty('summaryOf', summaryOf, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryOf]);

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

  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;

  const showActionGroupErrorIcon = (): boolean => {
    return !isOpen && some(actionParamsErrors.errors, (error) => !isEmpty(error));
  };

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    connectors.filter((connector) => connector.isPreconfigured)
  );

  const notifyWhenOptions = [
    {
      value: NotifyWhen.ONCE,
      inputDisplay: isSummary
        ? 'Only on status change'
        : `Once rule is in "${selectedActionGroup?.name}" status`,
      dropdownDisplay: (
        <>
          <strong>
            {isSummary
              ? 'Only on status change'
              : `Once rule is in "${selectedActionGroup?.name}" status`}
          </strong>
          <EuiText size="s" color="subdued">
            <p>Action runs when the rule status changes.</p>
          </EuiText>
        </>
      ),
    },
    {
      value: NotifyWhen.ON_EVERY_RUN,
      inputDisplay: isSummary
        ? `Every time rule is active`
        : `Every time rule is in "${selectedActionGroup?.name}" status`,
      disabled: isSummary,
      dropdownDisplay: (
        <>
          <strong>
            {isSummary
              ? `Every time rule is active`
              : `Every time rule is in "${selectedActionGroup?.name}" status`}
          </strong>
          <EuiText size="s" color="subdued">
            <p>
              Actions repeat at the rule interval when the rule is active.
              <br />
              Note: This option cannot be used for summarized actions.
            </p>
          </EuiText>
        </>
      ),
    },
    {
      value: NotifyWhen.ON_INTERVAL,
      inputDisplay: 'On a custom action interval',
      dropdownDisplay: (
        <>
          <strong>On a custom action interval.</strong>
          <EuiText size="s" color="subdued">
            <p>Actions run using the interval you set.</p>
          </EuiText>
        </>
      ),
    },
  ];

  const accordionContent = checkEnabledResult.isEnabled ? (
    <>
      {showSummaryOption(actionItem) && (
        <EuiFormRow>
          <>
            <EuiSwitch
              compressed
              label="Summarize"
              onChange={(e) => {
                setIsSummary(!isSummary);
              }}
              checked={isSummary}
            />{' '}
            <EuiIconTip position="right" type="questionInCircle" content="Summarize helper text" />
          </>
        </EuiFormRow>
      )}
      {actionGroups && selectedActionGroup && setActionGroupIdByIndex && (
        <EuiFormRow fullWidth>
          <EuiSuperSelect
            disabled={isSummary}
            prepend={
              <EuiFormLabel htmlFor={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}>
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
        </EuiFormRow>
      )}
      <EuiFormRow fullWidth>
        <EuiSuperSelect
          prepend="Notify when"
          fullWidth
          id={`addNewActionConnectorNotifyWhen-${actionItem.actionTypeId}`}
          data-test-subj={`addNewActionConnectorNotifyWhen-${index}`}
          valueOfSelected={notifyWhen}
          options={notifyWhenOptions}
          onChange={(when) => {
            setNotifyWhen(when as NotifyWhen);
          }}
        />
      </EuiFormRow>
      {notifyWhen === NotifyWhen.ON_INTERVAL && (
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            {isSummary && (
              <EuiFlexItem grow={2}>
                <EuiSelect
                  prepend="Of"
                  value={summaryOf}
                  options={[
                    {
                      value: SummaryOf.TIME_SPAN,
                      text: 'Time Span',
                    },
                    {
                      value: SummaryOf.SINGLE_RUN,
                      text: 'Single Run',
                    },
                  ]}
                  onChange={(e) => {
                    setSummaryOf(e.target.value as SummaryOf);
                  }}
                />
              </EuiFlexItem>
            )}
            <>
              <EuiFlexItem grow={1}>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  value={actionThrottle}
                  name="throttle"
                  data-test-subj="throttleInput"
                  prepend="Every"
                  onChange={(e) => {
                    setActionThrottle(parseInt(e.target.value, 10));
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiSelect
                  data-test-subj="throttleUnitInput"
                  value={actionThrottleUnit}
                  options={[
                    {
                      text: 'Seconds',
                      value: ThrottleUnit.SECOND,
                    },
                    {
                      text: 'Minute',
                      value: ThrottleUnit.MINUTE,
                    },
                    {
                      text: 'Hour',
                      value: ThrottleUnit.HOUR,
                    },
                    {
                      text: 'Day',
                      value: ThrottleUnit.DAY,
                    },
                  ]}
                  onChange={(e) => {
                    setActionThrottleUnit(e.target.value as ThrottleUnit);
                  }}
                />
              </EuiFlexItem>
            </>
          </EuiFlexGroup>
        </EuiFormRow>
      )}
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
          actionItem={actionItem}
          accordionIndex={index}
          actionTypesIndex={actionTypesIndex}
          actionTypeRegistered={actionTypeRegistered}
          connectors={connectors}
          onConnectorSelected={onConnectorSelected}
        />
      </EuiFormRow>
      {ParamsFieldsComponent ? (
        <EuiFormRow fullWidth>
          <EuiErrorBoundary>
            <Suspense fallback={null}>
              <ParamsFieldsComponent
                actionParams={actionItem.params as any}
                index={index}
                errors={actionParamsErrors.errors}
                editAction={setActionParamsProperty}
                messageVariables={availableActionVariables}
                defaultMessage={
                  isSummary
                    ? selectedActionGroup?.defaultSummaryActionMessage ??
                      defaultSummaryActionMessage
                    : selectedActionGroup?.defaultActionMessage ?? defaultActionMessage
                }
                actionConnector={actionConnector}
              />
            </Suspense>
          </EuiErrorBoundary>
        </EuiFormRow>
      ) : null}
    </>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <EuiAccordion
      initialIsOpen={true}
      key={index}
      id={index.toString()}
      onToggle={setIsOpen}
      paddingSize="l"
      className="actAccordionActionForm"
      buttonContentClassName="actAccordionActionForm__button"
      data-test-subj={`alertActionAccordion-${index}`}
      buttonContent={
        <EuiFlexGroup gutterSize="l" alignItems="center">
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
                  type="alert"
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
                  {selectedActionGroup && !isOpen && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge>{selectedActionGroup.name}</EuiBadge>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    {checkEnabledResult.isEnabled === false && (
                      <>
                        <EuiIconTip
                          type="alert"
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
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables,
  actionGroup?: ActionGroupWithMessageVariables
) {
  const transformedActionVariables: ActionVariable[] = transformActionVariables(
    actionVariables,
    actionGroup?.omitMessageVariables
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
