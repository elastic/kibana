/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiIconTip,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { sloFeatureId } from '../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../common/constants';
import { paths } from '../../../../common/locators/paths';
import { useCreateSlo } from '../../../hooks/slo/use_create_slo';
import { useFetchRulesForSlo } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { useUpdateSlo } from '../../../hooks/slo/use_update_slo';
import { useKibana } from '../../../utils/kibana_react';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import {
  transformCreateSLOFormToCreateSLOInput,
  transformSloResponseToCreateSloForm,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import {
  CREATE_RULE_SEARCH_PARAM,
  useAddRuleFlyoutState,
} from '../hooks/use_add_rule_flyout_state';
import { useCopyToJson } from '../hooks/use_copy_to_json';
import { useParseUrlState } from '../hooks/use_parse_url_state';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import { CreateSLOForm } from '../types';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import { SloEditFormIndicatorSection } from './slo_edit_form_indicator_section';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
}

export const maxWidth = 775;

export function SloEditForm({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const isEditMode = slo !== undefined;
  const { data: rules, isInitialLoading } = useFetchRulesForSlo({
    sloIds: slo?.id ? [slo.id] : undefined,
  });

  const sloFormValuesUrlState = useParseUrlState();
  const isAddRuleFlyoutOpen = useAddRuleFlyoutState(isEditMode);
  const [isCreateRuleCheckboxChecked, setIsCreateRuleCheckboxChecked] = useState(true);

  useEffect(() => {
    if (isEditMode && rules && rules[slo.id].length) {
      setIsCreateRuleCheckboxChecked(false);
    }
  }, [isEditMode, rules, slo]);

  const methods = useForm<CreateSLOForm>({
    defaultValues: Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, sloFormValuesUrlState),
    values: transformSloResponseToCreateSloForm(slo),
    mode: 'all',
  });
  const { watch, getFieldState, getValues, formState, trigger } = methods;
  const handleCopyToJson = useCopyToJson({ trigger, getValues });

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

  const handleSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    const values = getValues();

    if (isEditMode) {
      const processedValues = transformValuesToUpdateSLOInput(values);

      if (isCreateRuleCheckboxChecked) {
        await updateSlo({ sloId: slo.id, slo: processedValues });
        navigate(
          basePath.prepend(
            `${paths.observability.sloEdit(slo.id)}?${CREATE_RULE_SEARCH_PARAM}=true`
          )
        );
      } else {
        updateSlo({ sloId: slo.id, slo: processedValues });
        navigate(basePath.prepend(paths.observability.slos));
      }
    } else {
      const processedValues = transformCreateSLOFormToCreateSLOInput(values);

      if (isCreateRuleCheckboxChecked) {
        const { id } = await createSlo({ slo: processedValues });
        navigate(
          basePath.prepend(`${paths.observability.sloEdit(id)}?${CREATE_RULE_SEARCH_PARAM}=true`)
        );
      } else {
        createSlo({ slo: processedValues });
        navigate(basePath.prepend(paths.observability.slos));
      }
    }
  };

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  const handleChangeCheckbox = () => {
    setIsCreateRuleCheckboxChecked(!isCreateRuleCheckboxChecked);
  };

  const handleCloseRuleFlyout = async () => {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  };

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

          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiCheckbox
              id="createNewRuleCheckbox"
              checked={isCreateRuleCheckboxChecked}
              disabled={isInitialLoading}
              data-test-subj="createNewRuleCheckbox"
              label={
                <>
                  <span>
                    {i18n.translate('xpack.observability.slo.sloEdit.createAlert.title', {
                      defaultMessage: 'Create an',
                    })}{' '}
                    <strong>
                      {i18n.translate('xpack.observability.slo.sloEdit.createAlert.ruleName', {
                        defaultMessage: 'SLO burn rate alert rule',
                      })}
                    </strong>
                  </span>{' '}
                  <EuiIconTip
                    content={
                      'Selecting this will allow you to create a new alert rule for this SLO upon saving.'
                    }
                    position="top"
                  />
                </>
              }
              onChange={handleChangeCheckbox}
            />
          </EuiFlexGroup>

          <EuiSpacer size="m" />

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

            <EuiButtonEmpty
              color="primary"
              iconType="copyClipboard"
              data-test-subj="sloFormCopyJsonButton"
              disabled={isCreateSloLoading || isUpdateSloLoading}
              onClick={handleCopyToJson}
            >
              {i18n.translate('xpack.observability.slo.sloEdit.copyJsonButton', {
                defaultMessage: 'Copy JSON',
              })}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </FormProvider>

      {isAddRuleFlyoutOpen && slo ? (
        <AddRuleFlyout
          canChangeTrigger={false}
          consumer={sloFeatureId}
          initialValues={{ name: `${slo.name} burn rate rule`, params: { sloId: slo.id } }}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          onClose={handleCloseRuleFlyout}
          onSave={handleCloseRuleFlyout}
        />
      ) : null}
    </>
  );
}
