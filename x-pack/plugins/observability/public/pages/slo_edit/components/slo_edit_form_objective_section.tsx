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
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { SloEditFormObjectiveSectionTimeslices } from './slo_edit_form_objective_section_timeslices';
import { BUDGETING_METHOD_OPTIONS, TIMEWINDOW_OPTIONS } from '../constants';
import { maxWidth } from './slo_edit_form';

export function SloEditFormObjectiveSection() {
  const { control, watch } = useFormContext<CreateSLOInput>();
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.observability.slo.sloEdit.objectives.title', {
            defaultMessage: 'Set objectives',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="xl" />
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slo.sloEdit.budgetingMethod.label', {
              defaultMessage: 'Budgeting method',
            })}
          </EuiFormLabel>

          <Controller
            name="budgetingMethod"
            control={control}
            rules={{ required: true }}
            render={({ field: { ref, ...field } }) => (
              <EuiSelect
                {...field}
                required
                id={budgetingSelect}
                data-test-subj="sloFormBudgetingMethodSelect"
                options={BUDGETING_METHOD_OPTIONS}
              />
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slo.sloEdit.timeWindow.label', {
              defaultMessage: 'Time window',
            })}
          </EuiFormLabel>

          <Controller
            name="timeWindow.duration"
            control={control}
            rules={{ required: true }}
            render={({ field: { ref, ...field } }) => (
              <EuiSelect
                {...field}
                required
                id={timeWindowSelect}
                data-test-subj="sloFormTimeWindowDurationSelect"
                options={TIMEWINDOW_OPTIONS}
                value={String(field.value)}
              />
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormLabel>
            {i18n.translate('xpack.observability.slo.sloEdit.targetSlo.label', {
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
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFieldNumber
                {...field}
                required
                isInvalid={fieldState.invalid}
                data-test-subj="sloFormObjectiveTargetInput"
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
          <SloEditFormObjectiveSectionTimeslices />
        </>
      ) : null}
      <EuiSpacer size="xl" />
    </EuiPanel>
  );
}
