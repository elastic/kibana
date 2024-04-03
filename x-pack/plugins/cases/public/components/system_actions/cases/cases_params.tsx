/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';

import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
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
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { CASES_CONNECTOR_SUB_ACTION, OWNER_INFO } from '../../../../common/constants';
import * as i18n from './translations';
import type { CasesActionParams } from './types';
import { DEFAULT_TIME_WINDOW, TIME_UNITS } from './constants';
import { getTimeUnitOptions } from './utils';
import { useAlertDataViews } from '../hooks/use_alert_data_view';

export const CasesParamsFieldsComponent: React.FunctionComponent<
  ActionParamsProps<CasesActionParams>
> = ({ actionParams, editAction, errors, index, producerId }) => {
  const { appId } = useApplication();
  const owner = getCaseOwnerByAppId(appId);

  const { dataViews, loading: loadingAlertDataViews } = useAlertDataViews(
    producerId ? [producerId as ValidFeatureId] : []
  );

  const { timeWindow, reopenClosedCases, groupingBy } = useMemo(
    () =>
      actionParams.subActionParams ?? {
        timeWindow: `${DEFAULT_TIME_WINDOW}`,
        reopenClosedCases: false,
        groupingBy: [],
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
          owner: OWNER_INFO.cases.id,
        },
        index
      );
    }

    if (actionParams.subActionParams && actionParams.subActionParams?.owner !== owner) {
      editAction(
        'subActionParams',
        {
          ...actionParams.subActionParams,
          owner,
        },
        index
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams, owner, appId]);

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
    if (!dataViews?.length) {
      return [];
    }

    return dataViews
      .map((dataView) => {
        return dataView.fields
          .filter((field) => field.esTypes?.includes('keyword'))
          .map((field) => ({
            value: field.name,
            label: field.name,
          }));
      })
      .flat();
  }, [dataViews]);

  const selectedOptions = groupingBy.map((field) => ({ value: field, label: field }));

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
          errors.timeWindow.length > 0 &&
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
