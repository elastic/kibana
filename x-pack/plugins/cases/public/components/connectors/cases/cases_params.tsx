/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  EuiCheckbox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSuperSelect,
} from '@elastic/eui';
import { getTimeOptions } from '@kbn/triggers-actions-ui-plugin/public/common';
import * as i18n from './translations';
import { CasesActionParams } from './types';
import { TIME_WINDOW_SIZE, TIME_WINDOW_UNIT } from './constants';

export const CasesParamsFields: React.FunctionComponent<ActionParamsProps<CasesActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const [timeWindowSize, setTimeWindowSize] = useState<number>(TIME_WINDOW_SIZE);
  const [timeWindowUnit, setTimeWindowUnit] = useState<string>(TIME_WINDOW_UNIT);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Group alerts by field:">
            <EuiSuperSelect data-test-subj="groupByField" options={[]} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeWindowSize"
            // isInvalid={errors.timeWindowSize.length > 0}
            // error={errors.timeWindowSize}
            label={i18n.GROUP_BY_ALERT}
          >
            <EuiFieldNumber
              name="timeWindowSize"
              data-test-subj="timeWindowSizeNumber"
              // isInvalid={errors.timeWindowSize.length > 0}
              min={1}
              value={timeWindowSize || ''}
              onChange={(e) => {
                const { value } = e.target;
                const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                setTimeWindowSize(timeWindowSizeVal);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow id="timeWindowUnit">
            <EuiSelect
              name="timeWindowUnit"
              data-test-subj="timeWindowUnitSelect"
              // value={timeWindowUnit}
              // onChange={(e) => {
              //   setParam('timeWindowUnit', e.target.value);
              // }}
              options={getTimeOptions(timeWindowSize ?? 1)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiCheckbox
              id="reopenCase"
              checked={false}
              label={i18n.REOPEN_WHEN_CASE_IS_CLOSED}
              onChange={() => {}}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesParamsFields as default };
