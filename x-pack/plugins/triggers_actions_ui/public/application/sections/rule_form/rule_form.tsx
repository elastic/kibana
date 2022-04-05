/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState, useEffect, useCallback, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiFieldText,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiListGroupItem,
  EuiListGroup,
  EuiLink,
  EuiText,
  EuiNotificationBadge,
  EuiErrorBoundary,
  EuiToolTip,
  EuiCallOut,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { KibanaFeature } from '../../../../../features/public';
import {
  formatDuration,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  parseDuration,
} from '../../../../../alerting/common/parse_duration';
import { RuleReducerAction, InitialRule } from './rule_reducer';
import {
  RuleTypeModel,
  Rule,
  IErrorObject,
  RuleAction,
  RuleType,
  RuleTypeRegistryContract,
  ActionTypeRegistryContract,
  TriggersActionsUiConfig,
} from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { ActionForm } from '../action_connector_form';
import {
  RuleActionParam,
  ALERTS_FEATURE_ID,
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
} from '../../../../../alerting/common';
import { hasAllPrivilege, hasShowActionsCapability } from '../../lib/capabilities';
import { SolutionFilter } from './solution_filter';
import './rule_form.scss';
import { useKibana } from '../../../common/lib/kibana';
import { recoveredActionGroupMessage } from '../../constants';
import { getDefaultsForActionParams } from '../../lib/get_defaults_for_action_params';
import { IsEnabledResult, IsDisabledResult } from '../../lib/check_rule_type_enabled';
import { RuleNotifyWhen } from './rule_notify_when';
import { checkRuleTypeEnabled } from '../../lib/check_rule_type_enabled';
import { ruleTypeCompare, ruleTypeGroupCompare } from '../../lib/rule_type_compare';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { SectionLoading } from '../../components/section_loading';
import { useLoadRuleTypes } from '../../hooks/use_load_rule_types';
import { getInitialInterval } from './get_initial_interval';

const ENTER_KEY = 13;

function getProducerFeatureName(producer: string, kibanaFeatures: KibanaFeature[]) {
  return kibanaFeatures.find((featureItem) => featureItem.id === producer)?.name;
}

interface RuleFormProps<MetaData = Record<string, any>> {
  rule: InitialRule;
  config: TriggersActionsUiConfig;
  dispatch: React.Dispatch<RuleReducerAction>;
  errors: IErrorObject;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  operation: string;
  canChangeTrigger?: boolean; // to hide Change trigger button
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  metadata?: MetaData;
  filteredSolutions?: string[] | undefined;
}

export const RuleForm = ({
  rule,
  config,
  canChangeTrigger = true,
  dispatch,
  errors,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  operation,
  ruleTypeRegistry,
  actionTypeRegistry,
  metadata,
  filteredSolutions,
}: RuleFormProps) => {
  const {
    notifications: { toasts },
    docLinks,
    application: { capabilities },
    kibanaFeatures,
    charts,
    data,
    unifiedSearch,
  } = useKibana().services;
  const canShowActions = hasShowActionsCapability(capabilities);

  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);

  const defaultRuleInterval = getInitialInterval(config.minimumScheduleInterval?.value);
  const defaultScheduleInterval = getDurationNumberInItsUnit(defaultRuleInterval);
  const defaultScheduleIntervalUnit = getDurationUnitValue(defaultRuleInterval);

  const [ruleInterval, setRuleInterval] = useState<number | undefined>(
    rule.schedule.interval
      ? getDurationNumberInItsUnit(rule.schedule.interval)
      : defaultScheduleInterval
  );
  const [ruleIntervalUnit, setRuleIntervalUnit] = useState<string>(
    rule.schedule.interval
      ? getDurationUnitValue(rule.schedule.interval)
      : defaultScheduleIntervalUnit
  );
  const [ruleThrottle, setRuleThrottle] = useState<number | null>(
    rule.throttle ? getDurationNumberInItsUnit(rule.throttle) : null
  );
  const [ruleThrottleUnit, setRuleThrottleUnit] = useState<string>(
    rule.throttle ? getDurationUnitValue(rule.throttle) : 'h'
  );
  const [defaultActionGroupId, setDefaultActionGroupId] = useState<string | undefined>(undefined);

  const [availableRuleTypes, setAvailableRuleTypes] = useState<
    Array<{ ruleTypeModel: RuleTypeModel; ruleType: RuleType }>
  >([]);
  const [filteredRuleTypes, setFilteredRuleTypes] = useState<
    Array<{ ruleTypeModel: RuleTypeModel; ruleType: RuleType }>
  >([]);
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [solutions, setSolutions] = useState<Map<string, string> | undefined>(undefined);
  const [solutionsFilter, setSolutionFilter] = useState<string[]>([]);
  let hasDisabledByLicenseRuleTypes: boolean = false;
  const {
    ruleTypes,
    error: loadRuleTypesError,
    ruleTypeIndex,
  } = useLoadRuleTypes({ filteredSolutions });

  // load rule types
  useEffect(() => {
    if (rule.ruleTypeId && ruleTypeIndex?.has(rule.ruleTypeId)) {
      setDefaultActionGroupId(ruleTypeIndex.get(rule.ruleTypeId)!.defaultActionGroupId);
    }

    const getAvailableRuleTypes = (ruleTypesResult: RuleType[]) =>
      ruleTypeRegistry
        .list()
        .reduce(
          (
            arr: Array<{ ruleType: RuleType; ruleTypeModel: RuleTypeModel }>,
            ruleTypeRegistryItem: RuleTypeModel
          ) => {
            const ruleType = ruleTypesResult.find((item) => ruleTypeRegistryItem.id === item.id);
            if (ruleType) {
              arr.push({
                ruleType,
                ruleTypeModel: ruleTypeRegistryItem,
              });
            }
            return arr;
          },
          []
        )
        .filter((item) => item.ruleType && hasAllPrivilege(rule, item.ruleType))
        .filter((item) =>
          rule.consumer === ALERTS_FEATURE_ID
            ? !item.ruleTypeModel.requiresAppContext
            : item.ruleType!.producer === rule.consumer
        );

    const availableRuleTypesResult = getAvailableRuleTypes(ruleTypes);
    setAvailableRuleTypes(availableRuleTypesResult);

    const solutionsResult = availableRuleTypesResult.reduce(
      (result: Map<string, string>, ruleTypeItem) => {
        if (!result.has(ruleTypeItem.ruleType.producer)) {
          result.set(
            ruleTypeItem.ruleType.producer,
            (kibanaFeatures
              ? getProducerFeatureName(ruleTypeItem.ruleType.producer, kibanaFeatures)
              : capitalize(ruleTypeItem.ruleType.producer)) ??
              capitalize(ruleTypeItem.ruleType.producer)
          );
        }
        return result;
      },
      new Map()
    );
    setSolutions(
      new Map([...solutionsResult.entries()].sort(([, a], [, b]) => a.localeCompare(b)))
    );
  }, [ruleTypes, ruleTypeIndex, rule.ruleTypeId, kibanaFeatures, rule, ruleTypeRegistry]);

  useEffect(() => {
    if (loadRuleTypesError) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleForm.unableToLoadRuleTypesMessage',
          { defaultMessage: 'Unable to load rule types' }
        ),
      });
    }
  }, [loadRuleTypesError, toasts]);

  useEffect(() => {
    setRuleTypeModel(rule.ruleTypeId ? ruleTypeRegistry.get(rule.ruleTypeId) : null);
    if (rule.ruleTypeId && ruleTypeIndex && ruleTypeIndex.has(rule.ruleTypeId)) {
      setDefaultActionGroupId(ruleTypeIndex.get(rule.ruleTypeId)!.defaultActionGroupId);
    }
  }, [rule, rule.ruleTypeId, ruleTypeIndex, ruleTypeRegistry]);

  useEffect(() => {
    if (rule.schedule.interval) {
      const interval = getDurationNumberInItsUnit(rule.schedule.interval);
      const intervalUnit = getDurationUnitValue(rule.schedule.interval);
      setRuleInterval(interval);
      setRuleIntervalUnit(intervalUnit);
    }
  }, [rule.schedule.interval, defaultScheduleInterval, defaultScheduleIntervalUnit]);

  const setRuleProperty = useCallback(
    <Key extends keyof Rule>(key: Key, value: Rule[Key] | null) => {
      dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
    },
    [dispatch]
  );

  const setActions = useCallback(
    (updatedActions: RuleAction[]) => setRuleProperty('actions', updatedActions),
    [setRuleProperty]
  );

  const setRuleParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setRuleParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionProperty = <Key extends keyof RuleAction>(
    key: Key,
    value: RuleAction[Key] | null,
    index: number
  ) => {
    dispatch({ command: { type: 'setRuleActionProperty' }, payload: { key, value, index } });
  };

  const setActionParamsProperty = useCallback(
    (key: string, value: RuleActionParam, index: number) => {
      dispatch({ command: { type: 'setRuleActionParams' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  useEffect(() => {
    const searchValue = searchText ? searchText.trim().toLocaleLowerCase() : null;
    setFilteredRuleTypes(
      availableRuleTypes
        .filter((ruleTypeItem) =>
          solutionsFilter.length > 0
            ? solutionsFilter.find((item) => ruleTypeItem.ruleType!.producer === item)
            : ruleTypeItem
        )
        .filter((ruleTypeItem) =>
          searchValue
            ? ruleTypeItem.ruleType.name.toString().toLocaleLowerCase().includes(searchValue) ||
              ruleTypeItem.ruleType!.producer.toLocaleLowerCase().includes(searchValue) ||
              ruleTypeItem.ruleTypeModel.description.toLocaleLowerCase().includes(searchValue)
            : ruleTypeItem
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeRegistry, availableRuleTypes, searchText, JSON.stringify(solutionsFilter)]);

  const selectedRuleType = rule?.ruleTypeId ? ruleTypeIndex?.get(rule?.ruleTypeId) : undefined;
  const recoveryActionGroup = selectedRuleType?.recoveryActionGroup?.id;
  const getDefaultActionParams = useCallback(
    (actionTypeId: string, actionGroupId: string): Record<string, RuleActionParam> | undefined =>
      getDefaultsForActionParams(
        actionTypeId,
        actionGroupId,
        actionGroupId === recoveryActionGroup
      ),
    [recoveryActionGroup]
  );

  const tagsOptions = rule.tags ? rule.tags.map((label: string) => ({ label })) : [];

  const isActionGroupDisabledForActionType = useCallback(
    (ruleType: RuleType, actionGroupId: string, actionTypeId: string): boolean => {
      return isActionGroupDisabledForActionTypeId(
        actionGroupId === ruleType?.recoveryActionGroup?.id
          ? RecoveredActionGroup.id
          : actionGroupId,
        actionTypeId
      );
    },
    []
  );

  const RuleParamsExpressionComponent = ruleTypeModel ? ruleTypeModel.ruleParamsExpression : null;

  const ruleTypesByProducer = filteredRuleTypes.reduce(
    (
      result: Record<
        string,
        Array<{
          id: string;
          name: string;
          checkEnabledResult: IsEnabledResult | IsDisabledResult;
          ruleTypeItem: RuleTypeModel;
        }>
      >,
      ruleTypeValue
    ) => {
      const producer = ruleTypeValue.ruleType.producer;
      if (producer) {
        const checkEnabledResult = checkRuleTypeEnabled(ruleTypeValue.ruleType);
        if (!checkEnabledResult.isEnabled) {
          hasDisabledByLicenseRuleTypes = true;
        }
        (result[producer] = result[producer] || []).push({
          name: ruleTypeValue.ruleType.name,
          id: ruleTypeValue.ruleTypeModel.id,
          checkEnabledResult,
          ruleTypeItem: ruleTypeValue.ruleTypeModel,
        });
      }
      return result;
    },
    {}
  );

  const ruleTypeNodes = Object.entries(ruleTypesByProducer)
    .sort((a, b) => ruleTypeGroupCompare(a, b, solutions))
    .map(([solution, items], groupIndex) => (
      <Fragment key={`group${groupIndex}`}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          className="triggersActionsUI__ruleTypeNodeHeading"
        >
          <EuiFlexItem>
            <EuiTitle
              data-test-subj={`ruleType${groupIndex}Group`}
              size="xxxs"
              textTransform="uppercase"
            >
              <EuiTextColor color="subdued">
                {(kibanaFeatures
                  ? getProducerFeatureName(solution, kibanaFeatures)
                  : capitalize(solution)) ?? capitalize(solution)}
              </EuiTextColor>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">{items.length}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="full" margin="xs" />
        <EuiListGroup flush={true} gutterSize="m" size="l" maxWidth={false}>
          {items
            .sort((a, b) => ruleTypeCompare(a, b))
            .map((item, index) => {
              const ruleTypeListItemHtml = (
                <span>
                  <strong>{item.name}</strong>
                  <EuiText color="subdued" size="s">
                    <p>{item.ruleTypeItem.description}</p>
                  </EuiText>
                </span>
              );
              return (
                <EuiListGroupItem
                  wrapText
                  key={index}
                  data-test-subj={`${item.id}-SelectOption`}
                  color="primary"
                  label={
                    item.checkEnabledResult.isEnabled ? (
                      ruleTypeListItemHtml
                    ) : (
                      <EuiToolTip
                        position="top"
                        data-test-subj={`${item.id}-disabledTooltip`}
                        content={item.checkEnabledResult.message}
                      >
                        {ruleTypeListItemHtml}
                      </EuiToolTip>
                    )
                  }
                  isDisabled={!item.checkEnabledResult.isEnabled}
                  onClick={() => {
                    setRuleProperty('ruleTypeId', item.id);
                    setActions([]);
                    setRuleTypeModel(item.ruleTypeItem);
                    setRuleProperty('params', {});
                    if (ruleTypeIndex && ruleTypeIndex.has(item.id)) {
                      setDefaultActionGroupId(ruleTypeIndex.get(item.id)!.defaultActionGroupId);
                    }
                  }}
                />
              );
            })}
        </EuiListGroup>
        <EuiSpacer />
      </Fragment>
    ));

  const ruleTypeDetails = (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="selectedRuleTypeTitle">
            <h5 id="selectedRuleTypeTitle">
              {rule.ruleTypeId && ruleTypeIndex && ruleTypeIndex.has(rule.ruleTypeId)
                ? ruleTypeIndex.get(rule.ruleTypeId)!.name
                : ''}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {canChangeTrigger ? (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.ruleForm.changeRuleTypeAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
                setRuleProperty('ruleTypeId', null);
                setRuleTypeModel(null);
                setRuleProperty('params', {});
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {ruleTypeModel?.description && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText color="subdued" size="s" data-test-subj="ruleDescription">
              {ruleTypeModel.description}&nbsp;
              {ruleTypeModel?.documentationUrl && (
                <EuiLink
                  external
                  target="_blank"
                  data-test-subj="ruleDocumentationLink"
                  href={
                    typeof ruleTypeModel.documentationUrl === 'function'
                      ? ruleTypeModel.documentationUrl(docLinks)
                      : ruleTypeModel.documentationUrl
                  }
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleForm.documentationLabel"
                    defaultMessage="Documentation"
                  />
                </EuiLink>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiHorizontalRule />
      {RuleParamsExpressionComponent &&
      defaultActionGroupId &&
      rule.ruleTypeId &&
      selectedRuleType ? (
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <SectionLoading>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleForm.loadingRuleTypeParamsDescription"
                  defaultMessage="Loading rule type params…"
                />
              </SectionLoading>
            }
          >
            <RuleParamsExpressionComponent
              ruleParams={rule.params}
              ruleInterval={`${ruleInterval ?? 1}${ruleIntervalUnit}`}
              ruleThrottle={`${ruleThrottle ?? 1}${ruleThrottleUnit}`}
              alertNotifyWhen={rule.notifyWhen ?? 'onActionGroupChange'}
              errors={errors}
              setRuleParams={setRuleParams}
              setRuleProperty={setRuleProperty}
              defaultActionGroupId={defaultActionGroupId}
              actionGroups={selectedRuleType.actionGroups}
              metadata={metadata}
              charts={charts}
              data={data}
              unifiedSearch={unifiedSearch}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : null}
      {canShowActions &&
      defaultActionGroupId &&
      ruleTypeModel &&
      rule.ruleTypeId &&
      selectedRuleType ? (
        <>
          {errors.actionConnectors.length >= 1 ? (
            <>
              <EuiSpacer />
              <EuiCallOut color="danger" size="s" title={errors.actionConnectors} />
              <EuiSpacer />
            </>
          ) : null}
          <ActionForm
            actions={rule.actions}
            setHasActionsDisabled={setHasActionsDisabled}
            setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
            messageVariables={selectedRuleType.actionVariables}
            defaultActionGroupId={defaultActionGroupId}
            isActionGroupDisabledForActionType={(actionGroupId: string, actionTypeId: string) =>
              isActionGroupDisabledForActionType(selectedRuleType, actionGroupId, actionTypeId)
            }
            actionGroups={selectedRuleType.actionGroups.map((actionGroup) =>
              actionGroup.id === selectedRuleType.recoveryActionGroup.id
                ? {
                    ...actionGroup,
                    omitMessageVariables: selectedRuleType.doesSetRecoveryContext
                      ? 'keepContext'
                      : 'all',
                    defaultActionMessage: recoveredActionGroupMessage,
                  }
                : { ...actionGroup, defaultActionMessage: ruleTypeModel?.defaultActionMessage }
            )}
            getDefaultActionParams={getDefaultActionParams}
            setActionIdByIndex={(id: string, index: number) => setActionProperty('id', id, index)}
            setActionGroupIdByIndex={(group: string, index: number) =>
              setActionProperty('group', group, index)
            }
            setActions={setActions}
            setActionParamsProperty={setActionParamsProperty}
            actionTypeRegistry={actionTypeRegistry}
          />
        </>
      ) : null}
    </>
  );

  const labelForRuleChecked = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.ruleForm.checkFieldLabel"
        defaultMessage="Check every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.checkWithTooltip', {
          defaultMessage:
            'Define how often to evaluate the condition. Checks are queued; they run as close to the defined value as capacity allows. The xpack.alerting.rules.minimumScheduleInterval.value setting defines the minimum value. The xpack.alerting.rules.minimumScheduleInterval.enforce setting defines whether this minimum is required or suggested.',
        })}
      />
    </>
  );

  const getHelpTextForInterval = () => {
    if (!config || !config.minimumScheduleInterval) {
      return '';
    }

    // No help text if there is an error
    if (errors['schedule.interval'].length > 0) {
      return '';
    }

    if (config.minimumScheduleInterval.enforce) {
      // Always show help text if minimum is enforced
      return i18n.translate('xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpText', {
        defaultMessage: 'Interval must be at least {minimum}.',
        values: {
          minimum: formatDuration(config.minimumScheduleInterval.value, true),
        },
      });
    } else if (
      rule.schedule.interval &&
      parseDuration(rule.schedule.interval) < parseDuration(config.minimumScheduleInterval.value)
    ) {
      // Only show help text if current interval is less than suggested
      return i18n.translate(
        'xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpSuggestionText',
        {
          defaultMessage:
            'Intervals less than {minimum} are not recommended due to performance considerations.',
          values: {
            minimum: formatDuration(config.minimumScheduleInterval.value, true),
          },
        }
      );
    } else {
      return '';
    }
  };

  return (
    <EuiForm>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            id="ruleName"
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleForm.ruleNameLabel"
                defaultMessage="Name"
              />
            }
            isInvalid={errors.name.length > 0 && rule.name !== undefined}
            error={errors.name}
          >
            <EuiFieldText
              fullWidth
              autoFocus={true}
              isInvalid={errors.name.length > 0 && rule.name !== undefined}
              name="name"
              data-test-subj="ruleNameInput"
              value={rule.name || ''}
              onChange={(e) => {
                setRuleProperty('name', e.target.value);
              }}
              onBlur={() => {
                if (!rule.name) {
                  setRuleProperty('name', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.tagsFieldLabel', {
              defaultMessage: 'Tags (optional)',
            })}
          >
            <EuiComboBox
              noSuggestions
              fullWidth
              data-test-subj="tagsComboBox"
              selectedOptions={tagsOptions}
              onCreateOption={(searchValue: string) => {
                const newOptions = [...tagsOptions, { label: searchValue }];
                setRuleProperty(
                  'tags',
                  newOptions.map((newOption) => newOption.label)
                );
              }}
              onChange={(selectedOptions: Array<{ label: string }>) => {
                setRuleProperty(
                  'tags',
                  selectedOptions.map((selectedOption) => selectedOption.label)
                );
              }}
              onBlur={() => {
                if (!rule.tags) {
                  setRuleProperty('tags', []);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            data-test-subj="intervalFormRow"
            display="rowCompressed"
            helpText={getHelpTextForInterval()}
            label={labelForRuleChecked}
            isInvalid={errors['schedule.interval'].length > 0}
            error={errors['schedule.interval']}
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  isInvalid={errors['schedule.interval'].length > 0}
                  value={ruleInterval || ''}
                  name="interval"
                  data-test-subj="intervalInput"
                  onChange={(e) => {
                    const interval =
                      e.target.value !== '' ? parseInt(e.target.value, 10) : undefined;
                    setRuleInterval(interval);
                    setScheduleProperty('interval', `${e.target.value}${ruleIntervalUnit}`);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  fullWidth
                  value={ruleIntervalUnit}
                  options={getTimeOptions(ruleInterval ?? 1)}
                  onChange={(e) => {
                    setRuleIntervalUnit(e.target.value);
                    setScheduleProperty('interval', `${ruleInterval}${e.target.value}`);
                  }}
                  data-test-subj="intervalInputUnit"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <RuleNotifyWhen
            rule={rule}
            throttle={ruleThrottle}
            throttleUnit={ruleThrottleUnit}
            onNotifyWhenChange={useCallback(
              (notifyWhen) => {
                setRuleProperty('notifyWhen', notifyWhen);
              },
              [setRuleProperty]
            )}
            onThrottleChange={useCallback(
              (throttle: number | null, throttleUnit: string) => {
                setRuleThrottle(throttle);
                setRuleThrottleUnit(throttleUnit);
                setRuleProperty('throttle', throttle ? `${throttle}${throttleUnit}` : null);
              },
              [setRuleProperty]
            )}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      {ruleTypeModel ? (
        <>{ruleTypeDetails}</>
      ) : availableRuleTypes.length ? (
        <>
          <EuiHorizontalRule />
          <EuiFormRow
            fullWidth
            labelAppend={
              hasDisabledByLicenseRuleTypes && (
                <EuiTitle size="xxs">
                  <EuiLink
                    href={VIEW_LICENSE_OPTIONS_LINK}
                    target="_blank"
                    external
                    className="actActionForm__getMoreActionsLink"
                  >
                    <FormattedMessage
                      defaultMessage="Get more rule types"
                      id="xpack.triggersActionsUI.sections.actionForm.getMoreRuleTypesTitle"
                    />
                  </EuiLink>
                </EuiTitle>
              )
            }
            label={
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleForm.ruleTypeSelectLabel"
                    defaultMessage="Select rule type"
                  />
                </h5>
              </EuiTitle>
            }
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  data-test-subj="ruleSearchField"
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (e.target.value === '') {
                      setSearchText('');
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.keyCode === ENTER_KEY) {
                      setSearchText(inputText);
                    }
                  }}
                  placeholder={i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleForm.searchPlaceholderTitle',
                    { defaultMessage: 'Search' }
                  )}
                />
              </EuiFlexItem>
              {solutions ? (
                <EuiFlexItem grow={false}>
                  <SolutionFilter
                    key="solution-filter"
                    solutions={solutions}
                    onChange={(selectedSolutions: string[]) => setSolutionFilter(selectedSolutions)}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiSpacer />
          {errors.ruleTypeId.length >= 1 && rule.ruleTypeId !== undefined ? (
            <>
              <EuiSpacer />
              <EuiCallOut color="danger" size="s" title={errors.ruleTypeId} />
              <EuiSpacer />
            </>
          ) : null}
          {ruleTypeNodes}
        </>
      ) : ruleTypeIndex ? (
        <NoAuthorizedRuleTypes operation={operation} />
      ) : (
        <SectionLoading>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleForm.loadingRuleTypesDescription"
            defaultMessage="Loading rule types…"
          />
        </SectionLoading>
      )}
    </EuiForm>
  );
};

const NoAuthorizedRuleTypes = ({ operation }: { operation: string }) => (
  <EuiEmptyPrompt
    iconType="lock"
    data-test-subj="noAuthorizedRuleTypesPrompt"
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleForm.error.noAuthorizedRuleTypesTitle"
          defaultMessage="You have not been authorized to {operation} any Rule types"
          values={{ operation }}
        />
      </h2>
    }
    body={
      <div>
        <p role="banner">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleForm.error.noAuthorizedRuleTypes"
            defaultMessage="In order to {operation} a Rule you need to have been granted the appropriate privileges."
            values={{ operation }}
          />
        </p>
      </div>
    }
  />
);
