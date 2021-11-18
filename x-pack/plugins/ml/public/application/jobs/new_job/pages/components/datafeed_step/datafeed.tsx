/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { QueryInput } from './components/query';
import { QueryDelayInput } from './components/query_delay';
import { FrequencyInput } from './components/frequency';
import { ScrollSizeInput } from './components/scroll_size';
import { ResetQueryButton } from './components/reset_query';
import { TimeField } from './components/time_field';
import { ChangeDataView } from './components/data_view';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';

export const DatafeedStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const [isValidQuery, setIsValidQuery] = useState(false);

  useEffect(() => {
    const active =
      isValidQuery &&
      jobValidator.queryDelay.valid &&
      jobValidator.frequency.valid &&
      jobValidator.scrollSize.valid &&
      jobValidator.validating === false;
    setNextActive(active);
  }, [jobValidatorUpdated, isValidQuery]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem data-test-subj="mlAdvancedDatafeedQueryEditor">
              <QueryInput setIsValidQuery={setIsValidQuery} />
            </EuiFlexItem>
            <EuiFlexItem>
              <QueryDelayInput />
              <FrequencyInput />
              <ScrollSizeInput />
              <TimeField />
              <ChangeDataView isDisabled={false} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <ResetQueryButton />
          <WizardNav next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)} nextActive={nextActive}>
            <JsonEditorFlyout
              isDisabled={false}
              jobEditorMode={EDITOR_MODE.EDITABLE}
              datafeedEditorMode={EDITOR_MODE.EDITABLE}
            />
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
