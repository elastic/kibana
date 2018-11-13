/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';

const NavigationUi = ({
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
          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.navigation.savingText"
              defaultMessage="Saving"
            />
          </EuiText>
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
          <FormattedMessage
            id="xpack.rollupJobs.create.backButton.label"
            defaultMessage="Back"
          />
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
          <FormattedMessage
            id="xpack.rollupJobs.create.nextButton.label"
            defaultMessage="Next"
          />
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
          <FormattedMessage
            id="xpack.rollupJobs.create.saveButton.label"
            defaultMessage="Save"
          />
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

NavigationUi.propTypes = {
  hasNextStep: PropTypes.bool.isRequired,
  hasPreviousStep: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  goToNextStep: PropTypes.func,
  goToPreviousStep: PropTypes.func,
  save: PropTypes.func.isRequired,
  canGoToNextStep: PropTypes.bool.isRequired,
};

export const Navigation = injectI18n(NavigationUi);
