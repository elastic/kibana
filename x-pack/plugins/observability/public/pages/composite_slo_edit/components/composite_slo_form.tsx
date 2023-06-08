/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiSpacer, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { paths } from '../../../config/paths';
import { useCreateCompositeSlo } from '../../../hooks/composite_slo/use_create_composite_slo';
import { useUpdateCompositeSlo } from '../../../hooks/composite_slo/use_update_composite_slo';
import { useKibana } from '../../../utils/kibana_react';
import { COMPOSITE_SLO_FORM_DEFAULT_VALUES } from '../constants';
import {
  transformResponseToInput,
  transformValuesToCreateInput,
  transformValuesToUpdateInput,
} from '../helpers/process_form_values';
import { DescriptionSection } from './description_section';
import { ObjectiveSection } from './objective_section';
import { SourcesSection } from './sources_section';

export interface Props {
  compositeSlo: CompositeSLOWithSummaryResponse | undefined;
}

export const maxWidth = 775;

export function CompositeSloForm({ compositeSlo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const isEditMode = compositeSlo !== undefined;

  const methods = useForm({
    defaultValues: COMPOSITE_SLO_FORM_DEFAULT_VALUES,
    values: transformResponseToInput(compositeSlo),
    mode: 'all',
  });
  const { getValues, trigger, watch } = methods;

  const { mutateAsync: createCompositeSlo, isLoading: isCreating } = useCreateCompositeSlo();
  const { mutateAsync: updateCompositeSlo, isLoading: isUpdating } = useUpdateCompositeSlo();

  const handleSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    const values = getValues();

    if (isEditMode) {
      const processedValues = transformValuesToUpdateInput(values);
      updateCompositeSlo({ compositeSloId: compositeSlo.id, compositeSlo: processedValues });
    } else {
      const processedValues = transformValuesToCreateInput(values);
      createCompositeSlo({ compositeSlo: processedValues });
    }

    navigate(basePath.prepend(paths.observability.slos));
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  return (
    <FormProvider {...methods}>
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="sloForm">
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.observability.slo.compositeSloForm.sources.title', {
                defaultMessage: 'Add source SLOs',
              }),
              children: <SourcesSection isEditMode={isEditMode} />,
              status: 'incomplete',
            },
            {
              title: i18n.translate('xpack.observability.slo.compositeSloForm.objectives.title', {
                defaultMessage: 'Set objective',
              }),
              children: <ObjectiveSection isEditMode={isEditMode} />,
              status: 'incomplete',
            },
            {
              title: i18n.translate('xpack.observability.slo.compositeSloForm.description.title', {
                defaultMessage: 'Describe composite SLO',
              }),
              children: <DescriptionSection isEditMode={isEditMode} />,
              status: 'incomplete',
            },
          ]}
        />

        <pre>{JSON.stringify(watch(), null, 2)}</pre>
        <EuiSpacer size="m" />

        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiButton
            data-test-subj="compositeSloSubmitFormButton"
            color="primary"
            fill
            isLoading={isCreating || isUpdating}
            onClick={handleSubmit}
          >
            {isEditMode
              ? i18n.translate('xpack.observability.slo.compositeSloForm.editButton', {
                  defaultMessage: 'Update composite SLO',
                })
              : i18n.translate('xpack.observability.slo.compositeSloForm.createButton', {
                  defaultMessage: 'Create composite SLO',
                })}
          </EuiButton>

          <EuiButtonEmpty
            data-test-subj="compositeSloFormCancelButton"
            // @ts-ignore
            color="disabled"
            disabled={isCreating || isUpdating}
            onClick={() => navigateToUrl(basePath.prepend(paths.observability.slos))}
          >
            {i18n.translate('xpack.observability.slo.compositeSloForm.cancelButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </FormProvider>
  );
}
