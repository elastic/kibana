/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiSpacer, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GetSLOResponse } from '@kbn/slo-schema';
import React, { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { EquivalentApiRequest } from './common/equivalent_api_request';
import { paths } from '../../../../common/locators/paths';
import { useCreateSlo } from '../../../hooks/slo/use_create_slo';
import { useUpdateSlo } from '../../../hooks/slo/use_update_slo';
import { useKibana } from '../../../utils/kibana_react';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import {
  transformCreateSLOFormToCreateSLOInput,
  transformSloResponseToCreateSloForm,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import { useParseUrlState } from '../hooks/use_parse_url_state';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import { CreateSLOForm } from '../types';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';
import { useCreateRule } from '../../../hooks/use_create_rule';
import { createBurnRateRuleRequestBody } from '../helpers/create_burn_rate_rule_request_body';
import { BurnRateRuleParams } from '../../../typings';
import { SLOInspectWrapper } from './common/slo_inspect';

export interface Props {
  slo?: GetSLOResponse;
}

export const maxWidth = 775;

export function SloEditForm({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const isEditMode = slo !== undefined;
  const sloFormValuesFromUrlState = useParseUrlState();
  const sloFormValuesFromSloResponse = transformSloResponseToCreateSloForm(slo);

  const methods = useForm<CreateSLOForm>({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    values: sloFormValuesFromUrlState ? sloFormValuesFromUrlState : sloFormValuesFromSloResponse,
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

  const { showDescriptionSection, showObjectiveSection } = useShowSections(
    isEditMode,
    formState.isValidating,
    isIndicatorSectionValid,
    isObjectiveSectionValid
  );

  const { mutateAsync: createSlo, isLoading: isCreateSloLoading } = useCreateSlo();
  const { mutateAsync: updateSlo, isLoading: isUpdateSloLoading } = useUpdateSlo();
  const { mutateAsync: createBurnRateRule, isLoading: isCreateBurnRateRuleLoading } =
    useCreateRule<BurnRateRuleParams>();

  const handleSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    const values = getValues();

    if (isEditMode) {
      const processedValues = transformValuesToUpdateSLOInput(values);
      updateSlo({ sloId: slo.id, slo: processedValues });
      navigate(basePath.prepend(paths.observability.slos));
    } else {
      const processedValues = transformCreateSLOFormToCreateSLOInput(values);
      const resp = await createSlo({ slo: processedValues });
      await createBurnRateRule({
        rule: createBurnRateRuleRequestBody({ ...processedValues, id: resp.id }),
      });
      navigate(basePath.prepend(paths.observability.slos));
    }
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  return (
    <>
      <FormProvider {...methods}>
        <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="sloForm">
          <EuiSteps
            steps={[
              {
                title: i18n.translate('xpack.observability.slo.sloEdit.definition.title', {
                  defaultMessage: 'Define SLI',
                }),
                children: <SloEditFormIndicatorSection isEditMode={isEditMode} />,
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

          <EuiSpacer size="m" />

          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiButton
              color="primary"
              data-test-subj="sloFormSubmitButton"
              fill
              isLoading={isCreateSloLoading || isUpdateSloLoading || isCreateBurnRateRuleLoading}
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

            <EuiButtonEmpty
              color="primary"
              data-test-subj="sloFormCancelButton"
              disabled={isCreateSloLoading || isUpdateSloLoading}
              onClick={() => navigateToUrl(basePath.prepend(paths.observability.slos))}
            >
              {i18n.translate('xpack.observability.slo.sloEdit.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>

            <EquivalentApiRequest
              slo={slo}
              disabled={isCreateSloLoading || isUpdateSloLoading}
              isEditMode={isEditMode}
            />
            <SLOInspectWrapper slo={slo} disabled={isCreateSloLoading || isUpdateSloLoading} />
          </EuiFlexGroup>
        </EuiFlexGroup>
      </FormProvider>
    </>
  );
}
