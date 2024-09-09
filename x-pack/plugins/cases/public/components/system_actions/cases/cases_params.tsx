/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';

import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiComboBox,
} from '@elastic/eui';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import * as i18n from './translations';
import type { CasesActionParams } from './types';
import { CASES_CONNECTOR_SUB_ACTION } from '../../../../common/constants';
import { DEFAULT_TIME_WINDOW, TIME_UNITS } from './constants';
import { getTimeUnitOptions } from './utils';
import { useKibana } from '../../../common/lib/kibana';
import { TemplateSelector } from '../../create/templates';
import type { CasesConfigurationUITemplate } from '../../../containers/types';
import { getOwnerFromRuleConsumerProducer } from '../../../../common/utils/owner';
import { getConfigurationByOwner } from '../../../containers/configure/utils';
import { useGetAllCaseConfigurations } from '../../../containers/configure/use_get_all_case_configurations';

const DEFAULT_EMPTY_TEMPLATE_KEY = 'defaultEmptyTemplateKey';

export const CasesParamsFieldsComponent: React.FunctionComponent<
  ActionParamsProps<CasesActionParams>
> = ({ actionParams, editAction, errors, index, producerId, featureId }) => {
  const {
    http,
    notifications: { toasts },
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const owner = getOwnerFromRuleConsumerProducer(featureId, producerId);

  const { dataView, isLoading: loadingAlertDataViews } = useAlertsDataView({
    http,
    toasts,
    dataViewsService,
    featureIds: producerId
      ? [producerId as Exclude<ValidFeatureId, typeof AlertConsumers.SIEM>]
      : [],
  });

  const { data: configurations, isLoading: isLoadingCaseConfiguration } =
    useGetAllCaseConfigurations();

  const currentConfiguration = useMemo(
    () =>
      getConfigurationByOwner({
        configurations,
        owner,
      }),
    [configurations, owner]
  );

  const { timeWindow, reopenClosedCases, groupingBy, templateId } = useMemo(
    () =>
      actionParams.subActionParams ?? {
        timeWindow: `${DEFAULT_TIME_WINDOW}`,
        reopenClosedCases: false,
        groupingBy: [],
        templateId: null,
      },
    [actionParams.subActionParams]
  );

  const parsedTimeWindowSize = timeWindow.slice(0, timeWindow.length - 1);
  const parsedTimeWindowUnit = timeWindow.slice(-1);

  const timeWindowSize = isNaN(parseInt(parsedTimeWindowSize, 10))
    ? DEFAULT_TIME_WINDOW[0]
    : parsedTimeWindowSize.toString();

  const timeWindowUnit = Object.values(TIME_UNITS).includes(parsedTimeWindowUnit as TIME_UNITS)
    ? parsedTimeWindowUnit
    : DEFAULT_TIME_WINDOW[1];

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', CASES_CONNECTOR_SUB_ACTION.RUN, index);
    }

    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          timeWindow: `${DEFAULT_TIME_WINDOW}`,
          reopenClosedCases: false,
          groupingBy: [],
          templateId: null,
        },
        index
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const editSubActionProperty = useCallback(
    (key: string, value: unknown) => {
      return editAction(
        'subActionParams',
        { ...actionParams.subActionParams, [key]: value },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  const handleTimeWindowChange = useCallback(
    (key: 'timeWindowSize' | 'timeWindowUnit', value: string) => {
      if (!value) {
        return;
      }

      const newTimeWindow =
        key === 'timeWindowSize' ? `${value}${timeWindowUnit}` : `${timeWindowSize}${value}`;

      editSubActionProperty('timeWindow', newTimeWindow);
    },
    [editSubActionProperty, timeWindowUnit, timeWindowSize]
  );

  const onChangeComboBox = useCallback(
    (optionsValue: Array<EuiComboBoxOptionOption<string>>) => {
      editSubActionProperty('groupingBy', optionsValue?.length ? [optionsValue[0].value] : []);
    },
    [editSubActionProperty]
  );

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    if (!dataView) {
      return [];
    }

    return dataView.fields
      .filter((field) => Boolean(field.aggregatable))
      .map((field) => ({
        value: field.name,
        label: field.name,
      }));
  }, [dataView]);

  const selectedOptions = groupingBy.map((field) => ({ value: field, label: field }));
  const selectedTemplate = currentConfiguration.templates.find((t) => t.key === templateId);
  const defaultTemplate = {
    key: DEFAULT_EMPTY_TEMPLATE_KEY,
    name: i18n.DEFAULT_EMPTY_TEMPLATE_NAME,
    caseFields: null,
  };

  const onTemplateChange = useCallback(
    ({ key, caseFields }: Pick<CasesConfigurationUITemplate, 'caseFields' | 'key'>) => {
      editSubActionProperty('templateId', key === DEFAULT_EMPTY_TEMPLATE_KEY ? null : key);
    },
    [editSubActionProperty]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiFormRow fullWidth>
            <EuiComboBox
              fullWidth
              isClearable={true}
              singleSelection
              data-test-subj="group-by-alert-field-combobox"
              prepend={i18n.GROUP_BY_ALERT}
              isLoading={loadingAlertDataViews}
              isDisabled={loadingAlertDataViews}
              options={options}
              onChange={onChangeComboBox}
              selectedOptions={selectedOptions}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        id="timeWindow"
        error={errors.timeWindow}
        isInvalid={
          errors.timeWindow !== undefined &&
          Number(errors.timeWindow.length) > 0 &&
          timeWindow !== undefined
        }
      >
        <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
          <EuiFlexItem grow={4}>
            <EuiFieldNumber
              prepend={i18n.TIME_WINDOW}
              data-test-subj="time-window-size-input"
              value={timeWindowSize}
              min={1}
              step={1}
              onChange={(e) => {
                handleTimeWindowChange('timeWindowSize', e.target.value);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              data-test-subj="time-window-unit-select"
              value={timeWindowUnit}
              onChange={(e) => {
                handleTimeWindowChange('timeWindowUnit', e.target.value);
              }}
              options={getTimeUnitOptions(timeWindowSize)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <TemplateSelector
            key={currentConfiguration.id}
            isLoading={isLoadingCaseConfiguration}
            templates={[defaultTemplate, ...currentConfiguration.templates]}
            onTemplateChange={onTemplateChange}
            initialTemplate={selectedTemplate}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiCheckbox
            id={`reopen-case-${index}`}
            data-test-subj="reopen-case"
            checked={reopenClosedCases}
            label={i18n.REOPEN_WHEN_CASE_IS_CLOSED}
            onChange={(e) => {
              editSubActionProperty('reopenClosedCases', e.target.checked);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

CasesParamsFieldsComponent.displayName = 'CasesParamsFields';

export const CasesParamsFields = memo(CasesParamsFieldsComponent);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { CasesParamsFields as default };
