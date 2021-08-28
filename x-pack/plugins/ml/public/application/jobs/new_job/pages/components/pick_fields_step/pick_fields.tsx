/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  isAdvancedJobCreator,
  isCategorizationJobCreator,
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isRareJobCreator,
  isSingleMetricJobCreator,
} from '../../../common/job_creator/type_guards';
import { EDITOR_MODE, JsonEditorFlyout } from '../common/json_editor_flyout/json_editor_flyout';
import { JobCreatorContext } from '../job_creator_context';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { WizardNav } from '../wizard_nav/wizard_nav';
import { AdvancedView } from './components/advanced_view/advanced_view';
import { CategorizationView } from './components/categorization_view/categorization_view';
import { MultiMetricView } from './components/multi_metric_view/multi_metric_view';
import { PopulationView } from './components/population_view/population_view';
import { RareView } from './components/rare_view/rare_view';
import { SingleMetricView } from './components/single_metric_view/single_metric_view';

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const [selectionValid, setSelectionValid] = useState(false);

  useEffect(() => {
    setNextActive(selectionValid && jobValidator.isPickFieldsStepValid);
  }, [jobValidatorUpdated, selectionValid]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {isSingleMetricJobCreator(jobCreator) && (
            <SingleMetricView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isMultiMetricJobCreator(jobCreator) && (
            <MultiMetricView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isPopulationJobCreator(jobCreator) && (
            <PopulationView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isAdvancedJobCreator(jobCreator) && (
            <AdvancedView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isCategorizationJobCreator(jobCreator) && (
            <CategorizationView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isRareJobCreator(jobCreator) && (
            <RareView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          <WizardNav
            previous={() =>
              setCurrentStep(
                isAdvancedJobCreator(jobCreator)
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.TIME_RANGE
              )
            }
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={nextActive}
          >
            {isAdvancedJobCreator(jobCreator) && (
              <JsonEditorFlyout
                isDisabled={false}
                jobEditorMode={EDITOR_MODE.EDITABLE}
                datafeedEditorMode={EDITOR_MODE.EDITABLE}
              />
            )}
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
