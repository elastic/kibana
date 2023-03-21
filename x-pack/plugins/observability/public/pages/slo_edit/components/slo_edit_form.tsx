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
  EuiPanel,
  EuiSpacer,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../../utils/kibana_react';
import { useCreateSlo } from '../../../hooks/slo/use_create_slo';
import { useUpdateSlo } from '../../../hooks/slo/use_update_slo';
import { useSectionFormValidation } from '../helpers/use_section_form_validation';
import { SloEditFormDescription } from './slo_edit_form_description';
import { SloEditFormObjectives } from './slo_edit_form_objectives';
import {
  transformValuesToCreateSLOInput,
  transformSloResponseToCreateSloInput,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import { paths } from '../../../config/paths';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
}

export const maxWidth = 775;

export function SloEditForm({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    notifications: { toasts },
  } = useKibana().services;

  const methods = useForm({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    values: transformSloResponseToCreateSloInput(slo),
    mode: 'all',
  });
  const { watch, getFieldState, getValues, formState } = methods;

  const { isIndicatorSectionValid, isDescriptionSectionValid, isObjectiveSectionValid } =
    useSectionFormValidation({
      getFieldState,
      getValues,
      formState,
      watch,
    });

  const { mutateAsync: createSlo, isLoading: isCreateSloLoading } = useCreateSlo();
  const { mutateAsync: updateSlo, isLoading: isUpdateSloLoading } = useUpdateSlo();

  const isEditMode = slo !== undefined;

  const handleSubmit = async () => {
    const values = getValues();

    if (isEditMode) {
      try {
        const processedValues = transformValuesToUpdateSLOInput(values);

        await updateSlo({ sloId: slo.id, slo: processedValues });

        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.sloEdit.update.success', {
            defaultMessage: 'Successfully updated {name}',
            values: { name: getValues().name },
          })
        );

        navigateToUrl(basePath.prepend(paths.observability.slos));
      } catch (error) {
        toasts.addError(new Error(error), {
          title: i18n.translate('xpack.observability.slo.sloEdit.creation.error', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
    } else {
      try {
        const processedValues = transformValuesToCreateSLOInput(values);

        await createSlo({ slo: processedValues });

        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.sloEdit.creation.success', {
            defaultMessage: 'Successfully created {name}',
            values: { name: getValues().name },
          })
        );
        navigateToUrl(basePath.prepend(paths.observability.slos));
      } catch (error) {
        toasts.addError(new Error(error), {
          title: i18n.translate('xpack.observability.slo.sloEdit.creation.error', {
            defaultMessage: 'Something went wrong',
          }),
        });
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <EuiTimeline data-test-subj="sloForm">
        <EuiTimelineItem
          verticalAlign="top"
          icon={
            <EuiAvatar
              color={
                isIndicatorSectionValid
                  ? euiThemeVars.euiColorSuccess
                  : euiThemeVars.euiColorPrimary
              }
              iconType={isIndicatorSectionValid ? 'check' : ''}
              name={isIndicatorSectionValid ? 'Check' : '1'}
            />
          }
        >
          <SloEditFormIndicatorSection />
        </EuiTimelineItem>

        <EuiTimelineItem
          icon={
            <EuiAvatar
              color={
                isObjectiveSectionValid
                  ? euiThemeVars.euiColorSuccess
                  : euiThemeVars.euiColorPrimary
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
                {i18n.translate('xpack.observability.slo.sloEdit.objectives.title', {
                  defaultMessage: 'Set objectives',
                })}
              </h2>
            </EuiTitle>

            <EuiSpacer size="xl" />

            <SloEditFormObjectives />

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
                {i18n.translate('xpack.observability.slo.sloEdit.description.title', {
                  defaultMessage: 'Describe SLO',
                })}
              </h2>
            </EuiTitle>

            <EuiSpacer size="xl" />

            <SloEditFormDescription />

            <EuiSpacer size="xl" />

            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiButton
                color="primary"
                data-test-subj="sloFormSubmitButton"
                fill
                disabled={!formState.isValid}
                isLoading={isCreateSloLoading || isUpdateSloLoading}
                onClick={handleSubmit}
              >
                {isEditMode
                  ? i18n.translate('xpack.observability.slo.sloEdit.editSloButton', {
                      defaultMessage: 'Update SLO',
                    })
                  : i18n.translate('xpack.observability.slo.sloEdit.createSloButton', {
                      defaultMessage: 'Create SLO',
                    })}
              </EuiButton>

              <EuiButton
                color="ghost"
                data-test-subj="sloFormCancelButton"
                fill
                onClick={() => navigateToUrl(basePath.prepend(paths.observability.slos))}
              >
                {i18n.translate('xpack.observability.slo.sloEdit.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButton>
            </EuiFlexGroup>

            <EuiSpacer size="xl" />
          </EuiPanel>
        </EuiTimelineItem>
      </EuiTimeline>
    </FormProvider>
  );
}
