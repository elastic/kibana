/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect, Suspense, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiListGroupItem,
  EuiListGroup,
  EuiLink,
  EuiText,
  EuiNotificationBadge,
} from '@elastic/eui';
import { some, filter, map, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { capitalize } from 'lodash';
import { KibanaFeature } from '../../../../../features/public';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../../../alerts/common/parse_duration';
import { loadAlertTypes } from '../../lib/alert_api';
import { AlertReducerAction } from './alert_reducer';
import {
  AlertTypeModel,
  Alert,
  IErrorObject,
  AlertAction,
  AlertTypeIndex,
  AlertType,
} from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { useAlertsContext } from '../../context/alerts_context';
import { ActionForm } from '../action_connector_form';
import { ALERTS_FEATURE_ID } from '../../../../../alerts/common';
import { hasAllPrivilege, hasShowActionsCapability } from '../../lib/capabilities';
import { SolutionFilter } from './solution_filter';
import './alert_form.scss';

const ENTER_KEY = 13;

export function validateBaseProperties(alertObject: Alert) {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    alertTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alertObject.name) {
    errors.name.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  if (alertObject.schedule.interval.length < 2) {
    errors.interval.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  }
  if (!alertObject.alertTypeId) {
    errors.alertTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredAlertTypeIdText', {
        defaultMessage: 'Alert trigger is required.',
      })
    );
  }
  return validationResult;
}

function getProducerFeatureName(producer: string, kibanaFeatures: KibanaFeature[]) {
  return kibanaFeatures.find((featureItem) => featureItem.id === producer)?.name;
}

interface AlertFormProps {
  alert: Alert;
  dispatch: React.Dispatch<AlertReducerAction>;
  errors: IErrorObject;
  canChangeTrigger?: boolean; // to hide Change trigger button
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  operation: string;
}

export const AlertForm = ({
  alert,
  canChangeTrigger = true,
  dispatch,
  errors,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  operation,
}: AlertFormProps) => {
  const alertsContext = useAlertsContext();
  const {
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
    docLinks,
    capabilities,
    kibanaFeatures,
  } = alertsContext;
  const canShowActions = hasShowActionsCapability(capabilities);

  const [alertTypeModel, setAlertTypeModel] = useState<AlertTypeModel | null>(null);

  const [alertInterval, setAlertInterval] = useState<number | undefined>(
    alert.schedule.interval ? getDurationNumberInItsUnit(alert.schedule.interval) : undefined
  );
  const [alertIntervalUnit, setAlertIntervalUnit] = useState<string>(
    alert.schedule.interval ? getDurationUnitValue(alert.schedule.interval) : 'm'
  );
  const [alertThrottle, setAlertThrottle] = useState<number | null>(
    alert.throttle ? getDurationNumberInItsUnit(alert.throttle) : null
  );
  const [alertThrottleUnit, setAlertThrottleUnit] = useState<string>(
    alert.throttle ? getDurationUnitValue(alert.throttle) : 'm'
  );
  const [defaultActionGroupId, setDefaultActionGroupId] = useState<string | undefined>(undefined);
  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | null>(null);

  const [availableAlertTypes, setAvailableAlertTypes] = useState<
    Array<{ alertTypeModel: AlertTypeModel; alertType: AlertType }>
  >([]);
  const [filteredAlertTypes, setFilteredAlertTypes] = useState<
    Array<{ alertTypeModel: AlertTypeModel; alertType: AlertType }>
  >([]);
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [solutions, setSolutions] = useState<Map<string, string> | undefined>(undefined);
  const [solutionsFilter, setSolutionFilter] = useState<string[]>([]);

  // load alert types
  useEffect(() => {
    (async () => {
      try {
        const alertTypesResult = await loadAlertTypes({ http });
        const index: AlertTypeIndex = new Map();
        for (const alertTypeItem of alertTypesResult) {
          index.set(alertTypeItem.id, alertTypeItem);
        }
        if (alert.alertTypeId && index.has(alert.alertTypeId)) {
          setDefaultActionGroupId(index.get(alert.alertTypeId)!.defaultActionGroupId);
        }
        setAlertTypesIndex(index);
        const availableAlertTypesResult = getAvailableAlertTypes(alertTypesResult);
        setAvailableAlertTypes(availableAlertTypesResult);

        const solutionsResult = availableAlertTypesResult.reduce(
          (result: Map<string, string>, alertTypeItem) => {
            if (!result.has(alertTypeItem.alertType.producer)) {
              result.set(
                alertTypeItem.alertType.producer,
                (kibanaFeatures
                  ? getProducerFeatureName(alertTypeItem.alertType.producer, kibanaFeatures)
                  : capitalize(alertTypeItem.alertType.producer)) ??
                  capitalize(alertTypeItem.alertType.producer)
              );
            }
            return result;
          },
          new Map()
        );
        setSolutions(
          new Map([...solutionsResult.entries()].sort(([, a], [, b]) => a.localeCompare(b)))
        );
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAlertTypeModel(alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null);
  }, [alert, alertTypeRegistry]);

  const setAlertProperty = useCallback(
    (key: string, value: any) => {
      dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
    },
    [dispatch]
  );

  const setActions = useCallback(
    (updatedActions: AlertAction[]) => setAlertProperty('actions', updatedActions),
    [setAlertProperty]
  );

  const setAlertParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const setActionParamsProperty = useCallback(
    (key: string, value: any, index: number) => {
      dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  useEffect(() => {
    const searchValue = searchText ? searchText.trim().toLocaleLowerCase() : null;
    setFilteredAlertTypes(
      availableAlertTypes
        .filter((alertTypeItem) =>
          solutionsFilter.length > 0
            ? solutionsFilter.find((item) => alertTypeItem.alertType!.producer === item)
            : alertTypeItem
        )
        .filter((alertTypeItem) =>
          searchValue
            ? alertTypeItem.alertTypeModel.name
                .toString()
                .toLocaleLowerCase()
                .includes(searchValue) ||
              alertTypeItem.alertType!.producer.toLocaleLowerCase().includes(searchValue) ||
              alertTypeItem.alertTypeModel.description.toLocaleLowerCase().includes(searchValue)
            : alertTypeItem
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertTypeRegistry, availableAlertTypes, searchText, JSON.stringify(solutionsFilter)]);

  const getAvailableAlertTypes = (alertTypesResult: AlertType[]) =>
    alertTypeRegistry
      .list()
      .reduce(
        (
          arr: Array<{ alertType: AlertType; alertTypeModel: AlertTypeModel }>,
          alertTypeRegistryItem: AlertTypeModel
        ) => {
          const alertType = alertTypesResult.find((item) => alertTypeRegistryItem.id === item.id);
          if (alertType) {
            arr.push({
              alertType,
              alertTypeModel: alertTypeRegistryItem,
            });
          }
          return arr;
        },
        []
      )
      .filter((item) => item.alertType && hasAllPrivilege(alert, item.alertType))
      .filter((item) =>
        alert.consumer === ALERTS_FEATURE_ID
          ? !item.alertTypeModel.requiresAppContext
          : item.alertType!.producer === alert.consumer
      );

  const tagsOptions = alert.tags ? alert.tags.map((label: string) => ({ label })) : [];

  const AlertParamsExpressionComponent = alertTypeModel
    ? alertTypeModel.alertParamsExpression
    : null;

  const alertTypesByProducer = filteredAlertTypes.reduce(
    (
      result: Record<string, Array<{ id: string; name: string; alertTypeItem: AlertTypeModel }>>,
      alertTypeValue
    ) => {
      const producer = alertTypeValue.alertType.producer;
      if (producer) {
        (result[producer] = result[producer] || []).push({
          name:
            typeof alertTypeValue.alertTypeModel.name === 'string'
              ? alertTypeValue.alertTypeModel.name
              : alertTypeValue.alertTypeModel.name.props.defaultMessage,
          id: alertTypeValue.alertTypeModel.id,
          alertTypeItem: alertTypeValue.alertTypeModel,
        });
      }
      return result;
    },
    {}
  );

  const alertTypeNodes = Object.entries(alertTypesByProducer)
    .sort(([a], [b]) =>
      solutions ? solutions.get(a)!.localeCompare(solutions.get(b)!) : a.localeCompare(b)
    )
    .map(([solution, items], groupIndex) => (
      <Fragment key={`group${groupIndex}`}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          className="triggersActionsUI__alertTypeNodeHeading"
        >
          <EuiFlexItem>
            <EuiTitle
              data-test-subj={`alertType${groupIndex}Group`}
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
            .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
            .map((item, index) => (
              <Fragment key={index}>
                <EuiListGroupItem
                  data-test-subj={`${item.id}-SelectOption`}
                  color="primary"
                  label={
                    <span>
                      <strong>{item.name}</strong>
                      <EuiText color="subdued" size="s">
                        <p>{item.alertTypeItem.description}</p>
                      </EuiText>
                    </span>
                  }
                  onClick={() => {
                    setAlertProperty('alertTypeId', item.id);
                    setActions([]);
                    setAlertTypeModel(item.alertTypeItem);
                    setAlertProperty('params', {});
                    if (alertTypesIndex && alertTypesIndex.has(item.id)) {
                      setDefaultActionGroupId(alertTypesIndex.get(item.id)!.defaultActionGroupId);
                    }
                  }}
                />
              </Fragment>
            ))}
        </EuiListGroup>
        <EuiSpacer />
      </Fragment>
    ));

  const alertTypeDetails = (
    <Fragment>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="selectedAlertTypeTitle">
            <h5 id="selectedAlertTypeTitle">
              <FormattedMessage
                defaultMessage="{alertType}"
                id="xpack.triggersActionsUI.sections.alertForm.selectedAlertTypeTitle"
                values={{ alertType: alertTypeModel ? alertTypeModel.name : '' }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {canChangeTrigger ? (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.alertForm.changeAlertTypeAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
                setAlertProperty('alertTypeId', null);
                setAlertTypeModel(null);
                setAlertProperty('params', {});
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {alertTypeModel?.description && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText color="subdued" size="s" data-test-subj="alertDescription">
              {alertTypeModel.description}&nbsp;
              {alertTypeModel?.documentationUrl && (
                <EuiLink
                  external
                  target="_blank"
                  data-test-subj="alertDocumentationLink"
                  href={
                    typeof alertTypeModel.documentationUrl === 'function'
                      ? alertTypeModel.documentationUrl(docLinks)
                      : alertTypeModel.documentationUrl
                  }
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertForm.documentationLabel"
                    defaultMessage="Documentation"
                  />
                </EuiLink>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiHorizontalRule />
      {AlertParamsExpressionComponent &&
      defaultActionGroupId &&
      alertTypesIndex?.has(alert.alertTypeId) ? (
        <Suspense fallback={<CenterJustifiedSpinner />}>
          <AlertParamsExpressionComponent
            alertParams={alert.params}
            alertInterval={`${alertInterval ?? 1}${alertIntervalUnit}`}
            alertThrottle={`${alertThrottle ?? 1}${alertThrottleUnit}`}
            errors={errors}
            setAlertParams={setAlertParams}
            setAlertProperty={setAlertProperty}
            alertsContext={alertsContext}
            defaultActionGroupId={defaultActionGroupId}
            actionGroups={alertTypesIndex.get(alert.alertTypeId)!.actionGroups}
          />
        </Suspense>
      ) : null}
      {canShowActions &&
      defaultActionGroupId &&
      alertTypeModel &&
      alertTypesIndex?.has(alert.alertTypeId) ? (
        <ActionForm
          actions={alert.actions}
          setHasActionsDisabled={setHasActionsDisabled}
          setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
          messageVariables={alertTypesIndex.get(alert.alertTypeId)!.actionVariables}
          defaultActionGroupId={defaultActionGroupId}
          actionGroups={alertTypesIndex.get(alert.alertTypeId)!.actionGroups}
          setActionIdByIndex={(id: string, index: number) => setActionProperty('id', id, index)}
          setActionGroupIdByIndex={(group: string, index: number) =>
            setActionProperty('group', group, index)
          }
          setAlertProperty={setActions}
          setActionParamsProperty={setActionParamsProperty}
          http={http}
          actionTypeRegistry={actionTypeRegistry}
          defaultActionMessage={alertTypeModel?.defaultActionMessage}
          toastNotifications={toastNotifications}
          docLinks={docLinks}
          capabilities={capabilities}
        />
      ) : null}
    </Fragment>
  );

  const labelForAlertChecked = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.checkFieldLabel"
        defaultMessage="Check every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.checkWithTooltip', {
          defaultMessage: 'Define how often to evaluate the condition.',
        })}
      />
    </>
  );

  const labelForAlertRenotify = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.renotifyFieldLabel"
        defaultMessage="Notify every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.renotifyWithTooltip', {
          defaultMessage: 'Define how often to repeat the action while the alert is active.',
        })}
      />
    </>
  );

  return (
    <EuiForm>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            id="alertName"
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.alertNameLabel"
                defaultMessage="Name"
              />
            }
            isInvalid={errors.name.length > 0 && alert.name !== undefined}
            error={errors.name}
          >
            <EuiFieldText
              fullWidth
              autoFocus={true}
              isInvalid={errors.name.length > 0 && alert.name !== undefined}
              compressed
              name="name"
              data-test-subj="alertNameInput"
              value={alert.name || ''}
              onChange={(e) => {
                setAlertProperty('name', e.target.value);
              }}
              onBlur={() => {
                if (!alert.name) {
                  setAlertProperty('name', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.triggersActionsUI.sections.alertForm.tagsFieldLabel', {
              defaultMessage: 'Tags (optional)',
            })}
          >
            <EuiComboBox
              noSuggestions
              fullWidth
              compressed
              data-test-subj="tagsComboBox"
              selectedOptions={tagsOptions}
              onCreateOption={(searchValue: string) => {
                const newOptions = [...tagsOptions, { label: searchValue }];
                setAlertProperty(
                  'tags',
                  newOptions.map((newOption) => newOption.label)
                );
              }}
              onChange={(selectedOptions: Array<{ label: string }>) => {
                setAlertProperty(
                  'tags',
                  selectedOptions.map((selectedOption) => selectedOption.label)
                );
              }}
              onBlur={() => {
                if (!alert.tags) {
                  setAlertProperty('tags', []);
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
            display="rowCompressed"
            label={labelForAlertChecked}
            isInvalid={errors.interval.length > 0}
            error={errors.interval}
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  isInvalid={errors.interval.length > 0}
                  compressed
                  value={alertInterval || ''}
                  name="interval"
                  data-test-subj="intervalInput"
                  onChange={(e) => {
                    const interval =
                      e.target.value !== '' ? parseInt(e.target.value, 10) : undefined;
                    setAlertInterval(interval);
                    setScheduleProperty('interval', `${e.target.value}${alertIntervalUnit}`);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  fullWidth
                  compressed
                  value={alertIntervalUnit}
                  options={getTimeOptions(alertInterval ?? 1)}
                  onChange={(e) => {
                    setAlertIntervalUnit(e.target.value);
                    setScheduleProperty('interval', `${alertInterval}${e.target.value}`);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={labelForAlertRenotify}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  compressed
                  value={alertThrottle || ''}
                  name="throttle"
                  data-test-subj="throttleInput"
                  onChange={(e) => {
                    pipe(
                      some(e.target.value.trim()),
                      filter((value) => value !== ''),
                      map((value) => parseInt(value, 10)),
                      filter((value) => !isNaN(value)),
                      fold(
                        () => {
                          // unset throttle
                          setAlertThrottle(null);
                          setAlertProperty('throttle', null);
                        },
                        (throttle) => {
                          setAlertThrottle(throttle);
                          setAlertProperty('throttle', `${throttle}${alertThrottleUnit}`);
                        }
                      )
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  value={alertThrottleUnit}
                  options={getTimeOptions(alertThrottle ?? 1)}
                  onChange={(e) => {
                    setAlertThrottleUnit(e.target.value);
                    if (alertThrottle) {
                      setAlertProperty('throttle', `${alertThrottle}${e.target.value}`);
                    }
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      {alertTypeModel ? (
        <Fragment>{alertTypeDetails}</Fragment>
      ) : availableAlertTypes.length ? (
        <Fragment>
          <EuiHorizontalRule />
          <EuiFormRow
            fullWidth
            label={
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertForm.alertTypeSelectLabel"
                    defaultMessage="Select alert type"
                  />
                </h5>
              </EuiTitle>
            }
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  data-test-subj="alertSearchField"
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.keyCode === ENTER_KEY) {
                      setSearchText(inputText);
                    }
                  }}
                  placeholder={i18n.translate(
                    'xpack.triggersActionsUI.sections.alertForm.searchPlaceholderTitle',
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
          {alertTypeNodes}
        </Fragment>
      ) : alertTypesIndex ? (
        <NoAuthorizedAlertTypes operation={operation} />
      ) : (
        <CenterJustifiedSpinner />
      )}
    </EuiForm>
  );
};

const CenterJustifiedSpinner = () => (
  <EuiFlexGroup justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="m" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const NoAuthorizedAlertTypes = ({ operation }: { operation: string }) => (
  <EuiEmptyPrompt
    iconType="lock"
    data-test-subj="noAuthorizedAlertTypesPrompt"
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertForm.error.noAuthorizedAlertTypesTitle"
          defaultMessage="You have not been authorized to {operation} any Alert types"
          values={{ operation }}
        />
      </h2>
    }
    body={
      <div>
        <p role="banner">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertForm.error.noAuthorizedAlertTypes"
            defaultMessage="In order to {operation} an Alert you need to have been granted the appropriate privileges."
            values={{ operation }}
          />
        </p>
      </div>
    }
  />
);
