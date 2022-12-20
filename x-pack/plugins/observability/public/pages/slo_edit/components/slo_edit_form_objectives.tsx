/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { ChangeEvent, useState } from 'react';

const BUDGETING_METHOD_OPTIONS = [{ value: 'occurences', text: 'Occurences' }];

const TIMEWINDOW_OPTIONS = [
  { value: '30d', text: '30 days' },
  { value: '7d', text: '7 days' },
];

export function SloEditFormObjectives() {
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  const [budgetingMethod, setBudgetingMethod] = useState(BUDGETING_METHOD_OPTIONS[0].value);
  const [timeWindow, setTimeWindow] = useState(TIMEWINDOW_OPTIONS[0].value);
  const [sloTarget, setSloTarget] = useState('');

  const handleChangeBudgetMethod = (e: ChangeEvent<HTMLSelectElement>) => {
    setBudgetingMethod(e.target.value);
  };

  const handleChangeTimewindow = (e: ChangeEvent<HTMLSelectElement>) => {
    setTimeWindow(e.target.value);
  };

  const handleChangeSloTarget = (e: ChangeEvent<HTMLInputElement>) => {
    setSloTarget(e.target.value);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormLabel>Budgeting method</EuiFormLabel>
            <EuiSelect
              id={budgetingSelect}
              options={BUDGETING_METHOD_OPTIONS}
              value={budgetingMethod}
              onChange={handleChangeBudgetMethod}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormLabel>Timewindow</EuiFormLabel>
            <EuiSelect
              id={timeWindowSelect}
              options={TIMEWINDOW_OPTIONS}
              value={timeWindow}
              onChange={handleChangeTimewindow}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormLabel>Target / SLO (%)</EuiFormLabel>
            <EuiFieldNumber value={sloTarget} onChange={handleChangeSloTarget} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
