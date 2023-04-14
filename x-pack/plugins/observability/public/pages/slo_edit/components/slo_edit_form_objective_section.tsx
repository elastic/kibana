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
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { SloEditFormObjectiveSectionTimeslices } from './slo_edit_form_objective_section_timeslices';
import { BUDGETING_METHOD_OPTIONS, TIMEWINDOW_OPTIONS } from '../constants';
import { maxWidth } from './slo_edit_form';

export function SloEditFormObjectiveSection() {
  const { control, watch, getFieldState } = useFormContext<CreateSLOInput>();
  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth }}
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <span>
                {i18n.translate('xpack.observability.slo.sloEdit.budgetingMethod.label', {
                  defaultMessage: 'Budgeting method',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.observability.slo.sloEdit.budgetingMethod.tooltip',
                    {
                      defaultMessage:
                        'Occurrences-based SLO uses the ratio of good events over the total events during the time window. Timeslices-based SLO uses the ratio of good time slices over the total time slices during the time window.',
                    }
                  )}
                  position="top"
                />
              </span>
            }
          >
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
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={
              <span>
                {i18n.translate('xpack.observability.slo.sloEdit.timeWindow.label', {
                  defaultMessage: 'Time window',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.observability.slo.sloEdit.timeWindow.tooltip', {
                    defaultMessage:
                      'The rolling time window duration used to compute the SLO over.',
                  })}
                  position="top"
                />
              </span>
            }
          >
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
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            isInvalid={getFieldState('objective.target').invalid}
            label={
              <span>
                {i18n.translate('xpack.observability.slo.sloEdit.targetSlo.label', {
                  defaultMessage: 'Target / SLO (%)',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.observability.slo.sloEdit.targetSlo.tooltip', {
                    defaultMessage: 'The target objective in percentage for the SLO.',
                  })}
                  position="top"
                />
              </span>
            }
          >
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
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>

      {watch('budgetingMethod') === 'timeslices' ? (
        <>
          <EuiSpacer size="xl" />
          <SloEditFormObjectiveSectionTimeslices />
        </>
      ) : null}
    </EuiPanel>
  );
}
