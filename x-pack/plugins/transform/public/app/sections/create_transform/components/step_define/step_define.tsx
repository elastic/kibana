/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';
import { useSelector } from 'react-redux';

import { i18n } from '@kbn/i18n';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';

import { getCreateTransformRequestBody } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { selectTransformConfigValid } from '../../state_management/step_define_selectors';
import { WIZARD_STEPS } from '../../state_management/wizard_slice';

import { WizardNav } from '../wizard_nav';
import { useWizardContext } from '../wizard/wizard';

import { StepDefineForm } from './step_define_form';
import { StepDefineSummary } from './step_define_summary';

export const StepDefine: FC = () => {
  const appDependencies = useAppDependencies();
  const {
    ml: { FieldStatsFlyoutProvider },
    uiSettings,
    data,
    fieldFormats,
    charts,
  } = appDependencies;
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const currentStep = useWizardSelector((s) => s.wizard.currentStep);
  const stepDefineState = useWizardSelector((s) => s.stepDefine);
  const stepDetailsState = useWizardSelector((s) => s.stepDetails);
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);
  const transformConfigValid = useSelector(selectTransformConfigValid);

  const { setCurrentStep } = useWizardActions();

  const fieldStatsServices: FieldStatsServices = useMemo(
    () => ({
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    }),
    [uiSettings, data, fieldFormats, charts]
  );

  return (
    <>
      {currentStep === WIZARD_STEPS.DEFINE ? (
        <>
          <FieldStatsFlyoutProvider
            dataView={dataView}
            fieldStatsServices={fieldStatsServices}
            timeRangeMs={stepDefineState.timeRangeMs}
            dslQuery={
              getCreateTransformRequestBody(
                dataView,
                stepDefineState,
                stepDetailsState,
                runtimeMappings
              ).source.query
            }
          >
            <StepDefineForm />
          </FieldStatsFlyoutProvider>
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={transformConfigValid}
          />
        </>
      ) : (
        <StepDefineSummary />
      )}
    </>
  );
};

export const euiStepDefine = {
  title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
    defaultMessage: 'Configuration',
  }),
  children: <StepDefine />,
};
