/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SnapshotDetails, RestoreSettings } from '../../../../common/types';
import {
  RestoreSnapshotStepLogistics,
  RestoreSnapshotStepSettings,
  RestoreSnapshotStepReview,
} from './steps';
import { RestoreSnapshotNavigation } from './navigation';

interface Props {
  snapshotDetails: SnapshotDetails;
}

export const RestoreSnapshotForm: React.FunctionComponent<Props> = ({ snapshotDetails }) => {
  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(0);
  const stepMap: { [key: number]: any } = {
    1: RestoreSnapshotStepLogistics,
    2: RestoreSnapshotStepSettings,
    3: RestoreSnapshotStepReview,
  };
  const CurrentStepForm = stepMap[currentStep];

  // Restore details state
  const [restoreSettings, setRestoreSettings] = useState<RestoreSettings>({});

  const updateRestoreSettings = (updatedSettings: Partial<RestoreSettings>): void => {
    const newRestoreSettings = { ...restoreSettings, ...updatedSettings };
    setRestoreSettings(newRestoreSettings);
  };

  const updateCurrentStep = (step: number) => {
    // Validation logic here
    setCurrentStep(step);
  };

  const onBack = () => {
    // Validation logic here
    const previousStep = currentStep - 1;
    setCurrentStep(previousStep);
  };

  const onNext = () => {
    // Validation logic here
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setMaxCompletedStep(nextStep > maxCompletedStep ? nextStep : maxCompletedStep);
  };

  const onSubmit = () => {};

  return (
    <Fragment>
      <RestoreSnapshotNavigation
        currentStep={currentStep}
        maxCompletedStep={maxCompletedStep}
        updateCurrentStep={updateCurrentStep}
      />
      <EuiSpacer size="l" />
      <CurrentStepForm
        snapshotDetails={snapshotDetails}
        restoreSettings={restoreSettings}
        updateRestoreSettings={updateRestoreSettings}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        {currentStep > 1 ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="arrowLeft" onClick={() => onBack()}>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        {currentStep < 3 ? (
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="arrowRight" onClick={() => onNext()}>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.nextButtonLabel"
                defaultMessage="Next"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        {currentStep === 3 ? (
          <EuiFlexItem grow={false}>
            <EuiButton fill color="secondary" iconType="check" onClick={() => onSubmit()}>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.submitButtonLabel"
                defaultMessage="Execute restore"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
