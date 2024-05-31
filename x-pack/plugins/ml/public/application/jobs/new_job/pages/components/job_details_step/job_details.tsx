/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { JobIdInput } from './components/job_id';
import { JobDescriptionInput } from './components/job_description';
import { GroupsInput } from './components/groups';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { AdvancedSection } from './components/advanced_section';
import { AdditionalSection } from './components/additional_section';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';
import { isAdvancedJobCreator } from '../../../common/job_creator';

interface Props extends StepProps {
  advancedExpanded: boolean;
  setAdvancedExpanded: (a: boolean) => void;
  additionalExpanded: boolean;
  setAdditionalExpanded: (a: boolean) => void;
}

export const JobDetailsStep: FC<Props> = ({
  setCurrentStep,
  isCurrentStep,
  advancedExpanded,
  setAdvancedExpanded,
  additionalExpanded,
  setAdditionalExpanded,
}) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  useEffect(() => {
    const active =
      jobValidator.jobId.valid &&
      jobValidator.modelMemoryLimit.valid &&
      jobValidator.groupIds.valid &&
      jobValidator.latestValidationResult.jobIdExists?.valid === true &&
      jobValidator.latestValidationResult.groupIdsExist?.valid === true &&
      jobValidator.validating === false;
    setNextActive(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <JobIdInput />
              <GroupsInput />
            </EuiFlexItem>
            <EuiFlexItem>
              <JobDescriptionInput />
            </EuiFlexItem>
          </EuiFlexGroup>

          <AdditionalSection
            additionalExpanded={additionalExpanded}
            setAdditionalExpanded={setAdditionalExpanded}
          />

          <AdvancedSection
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
          />

          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            next={() => setCurrentStep(WIZARD_STEPS.VALIDATION)}
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
