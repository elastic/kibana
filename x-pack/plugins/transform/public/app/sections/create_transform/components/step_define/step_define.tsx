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

import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { selectTransformConfigValid } from '../../state_management/step_define_selectors';
import { selectCreateTransformRequestBody } from '../../state_management/step_create_selectors';
import { WIZARD_STEPS } from '../../state_management/wizard_slice';

import { WizardNav } from '../wizard_nav';
import { useDataView } from '../wizard/wizard';

import { StepDefineForm } from './step_define_form';
import { StepDefineSummary } from './step_define_summary';

export const StepDefineFormWrapper: FC = () => {
  const appDependencies = useAppDependencies();
  const {
    ml: { FieldStatsFlyoutProvider },
    uiSettings,
    data,
    fieldFormats,
    charts,
  } = appDependencies;
  const dataView = useDataView();

  const stepDefineState = useWizardSelector((s) => s.stepDefine);
  const transformConfigValid = useSelector(selectTransformConfigValid);
  const createTransformRequestBody = useWizardSelector((s) =>
    selectCreateTransformRequestBody(s, dataView)
  );

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
      <FieldStatsFlyoutProvider
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={stepDefineState.timeRangeMs}
        dslQuery={createTransformRequestBody.source.query}
      >
        <StepDefineForm />
      </FieldStatsFlyoutProvider>
      <WizardNav
        next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
        nextActive={transformConfigValid}
      />
    </>
  );
};

const StepDefine = () => {
  const currentStep = useWizardSelector((s) => s.wizard.currentStep);

  return currentStep === WIZARD_STEPS.DEFINE ? <StepDefineFormWrapper /> : <StepDefineSummary />;
};

export const euiStepDefine = {
  title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
    defaultMessage: 'Configuration',
  }),
  children: <StepDefine />,
};
