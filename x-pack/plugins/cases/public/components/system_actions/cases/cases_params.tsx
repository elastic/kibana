/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

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
} from '@elastic/eui';
import { CASES_CONNECTOR_SUB_ACTION } from '../../../../server/connectors/cases/constants';
import * as i18n from './translations';
import { CasesActionParams } from './types';
import { DEFAULT_TIME_WINDOW_SIZE, DEFAULT_TIME_WINDOW_UNIT } from './constants';
import { getTimeUnitOptions } from './utils';

export const CasesParamsFields: React.FunctionComponent<ActionParamsProps<CasesActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  if (!actionParams.subAction) {
    editAction('subAction', CASES_CONNECTOR_SUB_ACTION.RUN, index);
  }
  if (!actionParams.subActionParams) {
    editAction(
      'subActionParams',
      {
        timeWindow: `${DEFAULT_TIME_WINDOW_SIZE}${DEFAULT_TIME_WINDOW_UNIT}`,
      },
      index
    );
  }

  const { timeWindow, reopenClosedCases } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        timeWindow: `${DEFAULT_TIME_WINDOW_SIZE}${DEFAULT_TIME_WINDOW_UNIT}`,
        reopenClosedCases: false,
      } as unknown as CasesActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  console.log({ actionConnector, actionParams, editAction, errors, index, messageVariables });

  const [timeWindowSize, timeWindowUnit] = timeWindow.split('');

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      if (key === 'timeWindowSize') {
        if (value === '') {
          return;
        }
        const newTimeWindow = `${parseInt(value, 10)}${timeWindowUnit}`;

        return editAction(
          'subActionParams',
          {
            ...actionParams.subActionParams,
            timeWindow: newTimeWindow,
          },
          index
        );
      }

      if (key === 'timeWindowUnit') {
        const newTimeWindow = `${timeWindowSize}${value}`;

        return editAction(
          'subActionParams',
          {
            ...actionParams.subActionParams,
            timeWindow: newTimeWindow,
          },
          index
        );
      }

      return editAction(
        'subActionParams',
        { ...actionParams.subActionParams, [key]: value },
        index
      );
    },
    [editAction, index]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSuperSelect
              name="groupByAlertField"
              data-test-subj="groupByAlertField"
              prepend={i18n.GROUP_BY_ALERT}
              options={[]}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        error={errors['subActionParams.timeWindow.size']}
        isInvalid={
          errors['subActionParams.timeWindow.size'] !== undefined &&
          errors['subActionParams.timeWindow.size'].length > 0 &&
          timeWindow !== undefined
        }
      >
        <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFieldNumber
              prepend={i18n.TIME_WINDOW}
              name="timeWindowSize"
              data-test-subj="timeWindowSizeNumber"
              value={timeWindowSize}
              onChange={(e) => {
                editSubActionProperty('timeWindowSize', e.target.value);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              name="timeWindowUnit"
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                editSubActionProperty('timeWindowUnit', e.target.value);
              }}
              options={getTimeUnitOptions(timeWindowSize !== '' ? parseInt(timeWindowSize, 10) : 1)}
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
            checked={reopenClosedCases}
            label={i18n.REOPEN_WHEN_CASE_IS_CLOSED}
            onChange={(e) => editSubActionProperty('reopenClosedCases', e.target.value)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesParamsFields as default };
