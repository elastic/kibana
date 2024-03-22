/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  EuiCheckbox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { CASES_CONNECTOR_SUB_ACTION } from '../../../../server/connectors/cases/constants';
import * as i18n from './translations';
import { CasesActionParams } from './types';
import { DEFAULT_TIME_WINDOW_SIZE, DEFAULT_TIME_WINDOW_UNIT } from './constants';
import { getTimeUnitOptions } from './utils';
import { useAlertDataViews } from '../hooks/use_alert_data_view';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';

export const CasesParamsFields: React.FunctionComponent<ActionParamsProps<CasesActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  producerId,
}) => {
  const { appId } = useApplication();
  const owner = getCaseOwnerByAppId(appId);

  const { dataViews, loading } = useAlertDataViews(
    producerId ? [producerId as ValidFeatureId] : []
  );

  const { timeWindow, reopenClosedCases, groupingBy } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        timeWindow: `${DEFAULT_TIME_WINDOW_SIZE}${DEFAULT_TIME_WINDOW_UNIT}`,
        reopenClosedCases: false,
        groupingBy: [''],
      } as unknown as CasesActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [timeWindowSize, timeWindowUnit] = timeWindow.match(/[a-zA-Z]+|[0-9]+/g) ?? [];

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
          groupingBy: [''],
          owner,
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams, owner]);

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      return editAction(
        'subActionParams',
        { ...actionParams.subActionParams, [key]: value },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  const handleTimeWindowChange = (key: 'timeWindowSize' | 'timeWindowUnit', value: string) => {
    if (!value || isEmpty(value)) {
      return;
    }

    const newTimeWindow =
      key === 'timeWindowSize'
        ? `${parseInt(value, 10)}${timeWindowUnit}`
        : `${timeWindowSize}${value}`;

    editSubActionProperty('timeWindow', newTimeWindow);
  };

  const options: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    if (loading || !dataViews?.length) {
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
  }, [loading, dataViews]);

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
              isLoading={loading}
              disabled={loading}
              options={options}
              valueOfSelected={groupingBy[0]}
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
        error={errors['subActionParams.timeWindow.size']}
        isInvalid={
          errors['subActionParams.timeWindow.size'] !== undefined &&
          errors['subActionParams.timeWindow.size'].length > 0 &&
          timeWindow !== undefined
        }
      >
        <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              prepend={i18n.TIME_WINDOW}
              name="timeWindowSize"
              data-test-subj="time-window-size-input"
              min={0}
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
            id="reopenCase"
            name="reopenCase"
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

// eslint-disable-next-line import/no-default-export
export { CasesParamsFields as default };
