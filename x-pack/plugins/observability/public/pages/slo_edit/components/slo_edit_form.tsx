/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiFormLabel,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { Controller, useForm } from 'react-hook-form';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../../utils/kibana_react';
import { useCreateOrUpdateSlo } from '../../../hooks/slo/use_create_slo';
import { useCheckFormPartialValidities } from '../helpers/use_check_form_partial_validities';
import { SloEditFormDefinitionCustomKql } from './slo_edit_form_definition_custom_kql';
import { SloEditFormDescription } from './slo_edit_form_description';
import { SloEditFormObjectives } from './slo_edit_form_objectives';
import {
  transformValuesToCreateSLOInput,
  transformSloResponseToCreateSloInput,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import { paths } from '../../../config';
import { SLI_OPTIONS, SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
}

const maxWidth = 775;

export function SloEditForm({ slo }: Props) {
  const isEditMode = slo !== undefined;
  const {
    application: { navigateToUrl },
    http: { basePath },
    notifications: { toasts },
  } = useKibana().services;

  const { control, watch, getFieldState, getValues, formState, trigger } = useForm({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    values: transformSloResponseToCreateSloInput(slo),
    mode: 'all',
  });

  const { isDefinitionValid, isDescriptionValid, isObjectiveValid } = useCheckFormPartialValidities(
    { getFieldState, formState }
  );

  const { loading, success, error, createSlo, updateSlo } = useCreateOrUpdateSlo();

  const handleSubmit = () => {
    const values = getValues();
    if (isEditMode) {
      const processedValues = transformValuesToUpdateSLOInput(values);
      updateSlo(slo.id, processedValues);
    } else {
      const processedValues = transformValuesToCreateSLOInput(values);
      createSlo(processedValues);
    }
  };

  if (success) {
    toasts.addSuccess(
      isEditMode
        ? i18n.translate('xpack.observability.slos.sloEdit.update.success', {
            defaultMessage: 'Successfully updated {name}',
            values: { name: getValues().name },
          })
        : i18n.translate('xpack.observability.slos.sloEdit.creation.success', {
            defaultMessage: 'Successfully created {name}',
            values: { name: getValues().name },
          })
    );
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  if (error) {
    toasts.addError(new Error(error), {
      title: i18n.translate('xpack.observability.slos.sloEdit.creation.error', {
        defaultMessage: 'Something went wrong',
      }),
    });
  }

  return (
    <EuiTimeline data-test-subj="sloForm">
      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={isDefinitionValid ? 'Check' : '1'}
            iconType={isDefinitionValid ? 'check' : ''}
            color={isDefinitionValid ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary}
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.definition.title', {
                defaultMessage: 'Define SLI',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <EuiFormLabel>
            {i18n.translate('xpack.observability.slos.sloEdit.definition.sliType', {
              defaultMessage: 'SLI type',
            })}
          </EuiFormLabel>

          <Controller
            name="indicator.type"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiSelect
                data-test-subj="sloFormIndicatorTypeSelect"
                {...field}
                options={SLI_OPTIONS}
              />
            )}
          />

          <EuiSpacer size="xxl" />

          {watch('indicator.type') === 'sli.kql.custom' ? (
            <SloEditFormDefinitionCustomKql control={control} trigger={trigger} />
          ) : null}

          <EuiSpacer size="m" />
        </EuiPanel>
      </EuiTimelineItem>

      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={isObjectiveValid ? 'Check' : '2'}
            iconType={isObjectiveValid ? 'check' : ''}
            color={isObjectiveValid ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary}
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.objectives.title', {
                defaultMessage: 'Set objectives',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <SloEditFormObjectives control={control} watch={watch} />

          <EuiSpacer size="xl" />
        </EuiPanel>
      </EuiTimelineItem>

      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name={isDescriptionValid ? 'Check' : '3'}
            iconType={isDescriptionValid ? 'check' : ''}
            color={isDescriptionValid ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary}
          />
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.observability.slos.sloEdit.description.title', {
                defaultMessage: 'Describe SLO',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <SloEditFormDescription control={control} />

          <EuiSpacer size="xl" />

          <EuiButton
            fill
            color="primary"
            data-test-subj="sloFormSubmitButton"
            onClick={handleSubmit}
            disabled={!formState.isValid}
            isLoading={loading && !error}
          >
            {isEditMode
              ? i18n.translate('xpack.observability.slos.sloEdit.editSloButton', {
                  defaultMessage: 'Update SLO',
                })
              : i18n.translate('xpack.observability.slos.sloEdit.createSloButton', {
                  defaultMessage: 'Create SLO',
                })}
          </EuiButton>

          <EuiSpacer size="xl" />
        </EuiPanel>
      </EuiTimelineItem>
    </EuiTimeline>
  );
}
