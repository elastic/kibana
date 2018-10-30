/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';

export const Navigation = ({
  isSaving,
  hasNextStep,
  hasPreviousStep,
  goToNextStep,
  goToPreviousStep,
  save,
  canGoToNextStep,
}) => {
  if (isSaving) {
    return (
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l"/>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText>Saving</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  let previousStepButton;
  if (hasPreviousStep) {
    previousStepButton = (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={goToPreviousStep}
        >
          Back
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  }

  let nextStepButton;
  if (hasNextStep) {
    nextStepButton = (
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="arrowRight"
          iconSide="right"
          onClick={goToNextStep}
          isDisabled={!canGoToNextStep}
          fill
        >
          Next
        </EuiButton>
      </EuiFlexItem>
    );
  } else {
    nextStepButton = (
      <EuiFlexItem grow={false}>
        <EuiButton
          color="secondary"
          iconType="check"
          onClick={save}
          fill
        >
          Save
        </EuiButton>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
      {previousStepButton}
      {nextStepButton}
    </EuiFlexGroup>
  );
};

Navigation.propTypes = {
  hasNextStep: PropTypes.bool.isRequired,
  hasPreviousStep: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  goToNextStep: PropTypes.func,
  goToPreviousStep: PropTypes.func,
  save: PropTypes.func.isRequired,
  canGoToNextStep: PropTypes.bool.isRequired,
};
