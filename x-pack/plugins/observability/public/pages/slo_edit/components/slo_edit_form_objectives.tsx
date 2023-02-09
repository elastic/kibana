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
import type { CreateSLOInput } from '@kbn/slo-schema';

import { SloEditFormObjectivesTimeslices } from './slo_edit_form_objectives_timeslices';
import { BUDGETING_METHOD_OPTIONS, TIMEWINDOW_OPTIONS } from '../constants';

export interface Props {
  control: Control<CreateSLOInput>;
  watch: UseFormWatch<CreateSLOInput>;
}

export function SloEditFormObjectives({ control, watch }: Props) {
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  return (
    <>
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.budgetingMethod.label', {
              defaultMessage: 'Budgeting method',
            })}
          </EuiFormLabel>

          <Controller
            name="budgetingMethod"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiSelect
                id={budgetingSelect}
                data-test-subj="sloFormBudgetingMethodSelect"
                options={BUDGETING_METHOD_OPTIONS}
                {...field}
              />
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.timeWindow.label', {
              defaultMessage: 'Time window',
            })}
          </EuiFormLabel>

          <Controller
            name="timeWindow.duration"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiSelect
                id={timeWindowSelect}
                data-test-subj="sloFormTimeWindowDurationSelect"
                options={TIMEWINDOW_OPTIONS}
                {...field}
                value={String(field.value)}
              />
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.targetSlo.label', {
              defaultMessage: 'Target / SLO (%)',
            })}
          </EuiFormLabel>

          <Controller
            name="objective.target"
            control={control}
            rules={{
              required: true,
              min: 0.001,
              max: 99.999,
            }}
            render={({ field }) => (
              <EuiFieldNumber
                data-test-subj="sloFormObjectiveTargetInput"
                {...field}
                value={String(field.value)}
                min={0.001}
                max={99.999}
                step={0.001}
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
