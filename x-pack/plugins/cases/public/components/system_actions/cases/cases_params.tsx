/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';

import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { CASES_CONNECTOR_SUB_ACTION } from '../../../../common/constants';
import * as i18n from './translations';
import type { CasesActionParams } from './types';
import { DEFAULT_TIME_WINDOW_SIZE, DEFAULT_TIME_WINDOW_UNIT } from './constants';
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
      actionParams.subActionParams ??
      ({
        timeWindow: `${DEFAULT_TIME_WINDOW_SIZE}${DEFAULT_TIME_WINDOW_UNIT}`,
        reopenClosedCases: false,
        groupingBy: [],
      } as unknown as CasesActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [timeWindowSize, timeWindowUnit] = timeWindow.match(/[a-zA-Z]+|-?[0-9]+/g) ?? [];

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', CASES_CONNECTOR_SUB_ACTION.RUN, index);
    }

    if (!actionParams.subActionParams || !actionParams.subActionParams?.owner) {
      editAction(
        'subActionParams',
        {
          timeWindow: `${DEFAULT_TIME_WINDOW_SIZE}${DEFAULT_TIME_WINDOW_UNIT}`,
          reopenClosedCases: false,
          groupingBy: [],
          owner,
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams, owner]);

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

  const handleTimeWindowChange = (key: 'timeWindowSize' | 'timeWindowUnit', value: string) => {
    if (!value) {
      return;
    }

    const newTimeWindow =
      key === 'timeWindowSize'
        ? `${parseInt(value, 10)}${timeWindowUnit}`
        : `${timeWindowSize}${value}`;

    editSubActionProperty('timeWindow', newTimeWindow);
  };

  const options: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    if (!dataViews?.length) {
      return [];
    }
    return dataViews
      .map((dataView) => {
        const fields = dataView.fields;
        return fields.map((field) => ({
          value: field.name,
          inputDisplay: (
            <span data-test-subj={`group-by-alert-field-${field.name}`}>{field.name}</span>
          ),
        }));
      })
      .flat();
  }, [dataViews]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiFormRow fullWidth>
            <EuiSuperSelect
              fullWidth
              name="groupByAlertField"
              data-test-subj="group-by-alert-field"
              prepend={i18n.GROUP_BY_ALERT}
              isLoading={loadingAlertDataViews}
              disabled={loadingAlertDataViews}
              options={options}
              valueOfSelected={groupingBy?.[0] ?? ''}
              onChange={(value: string) => {
                editSubActionProperty('groupingBy', [value]);
              }}
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
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              prepend={i18n.TIME_WINDOW}
              name="timeWindowSize"
              data-test-subj="time-window-size-input"
              value={timeWindowSize}
              onChange={(e) => {
                handleTimeWindowChange('timeWindowSize', e.target.value);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              name="timeWindowUnit"
              data-test-subj="time-window-unit-select"
              value={timeWindowUnit}
              onChange={(e) => {
                handleTimeWindowChange('timeWindowUnit', e.target.value);
              }}
              options={getTimeUnitOptions(timeWindowSize ? parseInt(timeWindowSize, 10) : 1)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiCheckbox
            id={`reopen-case-${index}`}
            name={`reopen-case-${index}`}
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
