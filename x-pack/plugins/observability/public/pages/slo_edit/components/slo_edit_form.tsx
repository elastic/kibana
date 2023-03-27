/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../../utils/kibana_react';
import { useCreateSlo } from '../../../hooks/slo/use_create_slo';
import { useUpdateSlo } from '../../../hooks/slo/use_update_slo';
import { useSectionFormValidation } from '../helpers/use_section_form_validation';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';
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
  const isEditMode = slo !== undefined;

  const methods = useForm({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    values: transformSloResponseToCreateSloInput(slo),
    mode: 'all',
  });
  const { watch, getFieldState, getValues, formState, trigger } = methods;

  const { isIndicatorSectionValid, isObjectiveSectionValid, isDescriptionSectionValid } =
    useSectionFormValidation({
      getFieldState,
      getValues,
      formState,
      watch,
    });

  const [showObjectiveSection, setShowObjectiveSection] = useState<boolean>(isEditMode);
  const [showDescriptionSection, setShowDescriptionSection] = useState<boolean>(isEditMode);
  useEffect(() => {
    if (!formState.isValidating && !showObjectiveSection && isIndicatorSectionValid) {
      setShowObjectiveSection(true);
    }

    if (
      !formState.isValidating &&
      !showDescriptionSection &&
      isIndicatorSectionValid &&
      isObjectiveSectionValid
    ) {
      setShowDescriptionSection(true);
    }
  }, [
    showObjectiveSection,
    showDescriptionSection,
    isIndicatorSectionValid,
    isObjectiveSectionValid,
    formState,
  ]);

  const { mutateAsync: createSlo, isLoading: isCreateSloLoading } = useCreateSlo();
  const { mutateAsync: updateSlo, isLoading: isUpdateSloLoading } = useUpdateSlo();

  const handleSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

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
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="sloForm">
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.observability.slo.sloEdit.definition.title', {
                defaultMessage: 'Define SLI',
              }),
              children: <SloEditFormIndicatorSection />,
              status: isIndicatorSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.observability.slo.sloEdit.objectives.title', {
                defaultMessage: 'Set objectives',
              }),
              children: showObjectiveSection ? <SloEditFormObjectiveSection /> : null,
              status: showObjectiveSection && isObjectiveSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.observability.slo.sloEdit.description.title', {
                defaultMessage: 'Describe SLO',
              }),
              children: showDescriptionSection ? <SloEditFormDescriptionSection /> : null,
              status:
                showDescriptionSection && isDescriptionSectionValid ? 'complete' : 'incomplete',
            },
          ]}
        />

        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiButton
            color="primary"
            data-test-subj="sloFormSubmitButton"
            fill
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
            disabled={isCreateSloLoading || isUpdateSloLoading}
            onClick={() => navigateToUrl(basePath.prepend(paths.observability.slos))}
          >
            {i18n.translate('xpack.observability.slo.sloEdit.cancelButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </FormProvider>
  );
}
