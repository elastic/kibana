/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormLabel,
  EuiSelect,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Control, Controller, UseFormWatch } from 'react-hook-form';

import { SloEditFormObjectivesTimeslices } from './slo_edit_form_objectives_timeslices';
import type { CreateSLOParamsForFE } from '../../../typings';

export const BUDGETING_METHOD_OPTIONS = [
  { value: 'occurrences', text: 'Occurences' },
  { value: 'timeslices', text: 'Timeslices' },
];

export const TIMEWINDOW_OPTIONS = [30, 7].map((number) => ({
  value: `${number}d`,
  text: i18n.translate('xpack.observability.slos.sloEdit.objectives.days', {
    defaultMessage: '{number} days',
    values: { number },
  }),
}));

interface SloEditFormObjectivesProps {
  control: Control<CreateSLOParamsForFE>;
  watch: UseFormWatch<CreateSLOParamsForFE>;
}

export function SloEditFormObjectives({ control, watch }: SloEditFormObjectivesProps) {
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  return (
    <>
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.objectives.budgetingMethod', {
              defaultMessage: 'Budgeting method',
            })}
          </EuiFormLabel>

          <Controller
            name="budgetingMethod"
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
            name="timeWindow.duration"
            shouldUnregister
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiSelect
                id={timeWindowSelect}
                options={TIMEWINDOW_OPTIONS}
                {...field}
                value={String(field.value)}
              />
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
      </EuiFlexGrid>

      {watch('budgetingMethod') === 'timeslices' ? (
        <>
          <EuiSpacer size="xl" />
          <SloEditFormObjectivesTimeslices control={control} />
        </>
      ) : null}
    </>
  );
}
