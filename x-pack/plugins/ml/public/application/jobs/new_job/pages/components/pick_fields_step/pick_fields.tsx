/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../job_creator_context';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { SingleMetricView } from './components/single_metric_view';
import { MultiMetricView } from './components/multi_metric_view';
import { PopulationView } from './components/population_view';
import { AdvancedView } from './components/advanced_view';
import { CategorizationView } from './components/categorization_view';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';
import {
  isSingleMetricJobCreator,
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isCategorizationJobCreator,
  isAdvancedJobCreator,
} from '../../../common/job_creator';

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  useEffect(() => {
    setNextActive(jobValidator.isPickFieldsStepValid);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {isSingleMetricJobCreator(jobCreator) && (
            <SingleMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {isMultiMetricJobCreator(jobCreator) && (
            <MultiMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {isPopulationJobCreator(jobCreator) && (
            <PopulationView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {isAdvancedJobCreator(jobCreator) && (
            <AdvancedView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {isCategorizationJobCreator(jobCreator) && (
            <CategorizationView isActive={isCurrentStep} setCanProceed={setNextActive} />
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
