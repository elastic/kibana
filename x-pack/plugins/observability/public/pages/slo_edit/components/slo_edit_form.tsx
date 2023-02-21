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
  EuiFlexGroup,
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
import { useSectionFormValidation } from '../helpers/use_section_form_validation';
import { CustomKqlIndicatorTypeForm } from './custom_kql/custom_kql_indicator_type_form';
import { SloEditFormDescription } from './slo_edit_form_description';
import { SloEditFormObjectives } from './slo_edit_form_objectives';
import {
  transformValuesToCreateSLOInput,
  transformSloResponseToCreateSloInput,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import { paths } from '../../../config';
import { SLI_OPTIONS, SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { ApmLatencyIndicatorTypeForm } from './apm_latency/apm_latency_indicator_type_form';
import { ApmAvailabilityIndicatorTypeForm } from './apm_availability/apm_availability_indicator_type_form';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
}

const maxWidth = 775;

export function SloEditForm({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    notifications: { toasts },
  } = useKibana().services;

  const { control, watch, getFieldState, getValues, formState } = useForm({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    values: transformSloResponseToCreateSloInput(slo),
    mode: 'all',
  });

  const { isIndicatorSectionValid, isDescriptionSectionValid, isObjectiveSectionValid } =
    useSectionFormValidation({
      getFieldState,
      getValues,
      formState,
      watch,
    });

  const { createSlo, updateSlo } = useCreateOrUpdateSlo();

  const isEditMode = slo !== undefined;

  const handleSubmit = async () => {
    const values = getValues();

    if (isEditMode) {
      try {
        const processedValues = transformValuesToUpdateSLOInput(values);

        await updateSlo.mutateAsync({ sloId: slo.id, slo: processedValues });

        toasts.addSuccess(
          i18n.translate('xpack.observability.slos.sloEdit.update.success', {
            defaultMessage: 'Successfully updated {name}',
            values: { name: getValues().name },
          })
        );

        navigateToUrl(basePath.prepend(paths.observability.slos));
      } catch (error) {
        toasts.addError(new Error(error), {
          title: i18n.translate('xpack.observability.slos.sloEdit.creation.error', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
    } else {
      try {
        const processedValues = transformValuesToCreateSLOInput(values);

        await createSlo.mutateAsync({ slo: processedValues });

        toasts.addSuccess(
          i18n.translate('xpack.observability.slos.sloEdit.creation.success', {
            defaultMessage: 'Successfully created {name}',
            values: { name: getValues().name },
          })
        );
        navigateToUrl(basePath.prepend(paths.observability.slos));
      } catch (error) {
        toasts.addError(new Error(error), {
          title: i18n.translate('xpack.observability.slos.sloEdit.creation.error', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
    }
  };

  const getIndicatorTypeForm = () => {
    switch (watch('indicator.type')) {
      case 'sli.kql.custom':
        return <CustomKqlIndicatorTypeForm control={control} watch={watch} />;
      case 'sli.apm.transactionDuration':
        return <ApmLatencyIndicatorTypeForm control={control} />;
      case 'sli.apm.transactionErrorRate':
        return <ApmAvailabilityIndicatorTypeForm control={control} />;
      default:
        return null;
    }
  };

  return (
    <EuiTimeline data-test-subj="sloForm">
      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            color={
              isIndicatorSectionValid ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary
            }
            iconType={isIndicatorSectionValid ? 'check' : ''}
            name={isIndicatorSectionValid ? 'Check' : '1'}
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
            render={({ field: { ref, ...field } }) => (
              <EuiSelect
                data-test-subj="sloFormIndicatorTypeSelect"
                {...field}
                options={SLI_OPTIONS}
              />
            )}
          />

          <EuiSpacer size="xxl" />

          {getIndicatorTypeForm()}

          <EuiSpacer size="m" />
        </EuiPanel>
      </EuiTimelineItem>

      <EuiTimelineItem
        icon={
          <EuiAvatar
            color={
              isObjectiveSectionValid ? euiThemeVars.euiColorSuccess : euiThemeVars.euiColorPrimary
            }
            iconType={isObjectiveSectionValid ? 'check' : ''}
            name={isObjectiveSectionValid ? 'Check' : '2'}
          />
        }
        verticalAlign="top"
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
            name={isDescriptionSectionValid ? 'Check' : '3'}
            iconType={isDescriptionSectionValid ? 'check' : ''}
            color={
              isDescriptionSectionValid
                ? euiThemeVars.euiColorSuccess
                : euiThemeVars.euiColorPrimary
            }
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

          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiButton
              color="primary"
              data-test-subj="sloFormSubmitButton"
              fill
              disabled={!formState.isValid}
              isLoading={createSlo.isLoading || updateSlo.isLoading}
              onClick={handleSubmit}
            >
              {isEditMode
                ? i18n.translate('xpack.observability.slos.sloEdit.editSloButton', {
                    defaultMessage: 'Update SLO',
                  })
                : i18n.translate('xpack.observability.slos.sloEdit.createSloButton', {
                    defaultMessage: 'Create SLO',
                  })}
            </EuiButton>

            <EuiButton
              color="ghost"
              data-test-subj="sloFormCancelButton"
              fill
              onClick={() => navigateToUrl(basePath.prepend(paths.observability.slos))}
            >
              {i18n.translate('xpack.observability.slos.sloEdit.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />
        </EuiPanel>
      </EuiTimelineItem>
    </EuiTimeline>
  );
}
