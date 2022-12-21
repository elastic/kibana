/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Control, Controller } from 'react-hook-form';

import type { CreateSLOParams } from '../../../../server/types/rest_specs';

export const BUDGETING_METHOD_OPTIONS = [
  { value: 'occurrences', text: 'Occurences' },
  { value: 'timeslices', text: 'Timeslices' },
];

export const TIMEWINDOW_OPTIONS = [
  {
    value: '30d',
    text: i18n.translate('xpack.observability.slos.sloEdit.objectives.days', {
      defaultMessage: '{number} days',
      values: { number: 30 },
    }),
  },
  {
    value: '7d',
    text: i18n.translate('xpack.observability.slos.sloEdit.objectives.days', {
      defaultMessage: '{number} days',
      values: { number: 7 },
    }),
  },
];

interface SloEditFormObjectivesProps {
  control: Control<CreateSLOParams>;
}

export function SloEditFormObjectives({ control }: SloEditFormObjectivesProps) {
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('xpack.observability.slos.sloEdit.objectives.budgetingMethod', {
                defaultMessage: 'Budgeting method',
              })}
            </EuiFormLabel>

            <Controller
              name="budgeting_method"
              shouldUnregister
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <EuiSelect id={budgetingSelect} options={BUDGETING_METHOD_OPTIONS} {...field} />
              )}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('xpack.observability.slos.sloEdit.objectives.timeWindow', {
                defaultMessage: 'Time window',
              })}
            </EuiFormLabel>

            <Controller
              name="time_window.duration"
              shouldUnregister
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <EuiSelect id={timeWindowSelect} options={TIMEWINDOW_OPTIONS} {...field} />
              )}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormLabel>
              {i18n.translate('xpack.observability.slos.sloEdit.objectives.targetSlo', {
                defaultMessage: 'Target / SLO (%)',
              })}
            </EuiFormLabel>

            <Controller
              name="objective.target"
              shouldUnregister
              control={control}
              rules={{ required: true, min: 0.0001, max: 100, validate: (value) => value > 0 }}
              render={({ field }) => (
                <EuiFieldNumber
                  {...field}
                  min={0}
                  max={100}
                  step={0.0001}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
