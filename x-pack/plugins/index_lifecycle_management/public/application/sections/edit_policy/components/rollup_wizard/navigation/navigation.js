/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const Navigation = ({
  hasNextStep,
  hasPreviousStep,
  goToNextStep,
  goToPreviousStep,
  save,
  canGoToNextStep,
  isNewRollup,
}) => {
  const previousStepButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="arrowLeft"
        onClick={goToPreviousStep}
        data-test-subj="rollupBackButton"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.rollup.create.backButton.label"
          defaultMessage="Back"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
  );

  const nextStepButton = (
    <EuiFlexItem grow={false}>
      <EuiButton
        iconType="arrowRight"
        iconSide="right"
        onClick={goToNextStep}
        disabled={!canGoToNextStep}
        fill
        data-test-subj="rollupNextButton"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.rollup.create.nextButton.label"
          defaultMessage="Next"
        />
      </EuiButton>
    </EuiFlexItem>
  );

  const saveButton = (
    <EuiFlexItem grow={false}>
      <EuiButton color="secondary" fill onClick={save} data-test-subj="rollupSaveButton">
        {isNewRollup ? (
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.rollup.create.addRollupToPolicyButton.label"
            defaultMessage="Add to policy and return to editing phases"
          />
        ) : (
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.rollup.create.updatePolicyRollupButton.label"
            defaultMessage="Update and return to editing phases"
          />
        )}
      </EuiButton>
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
      {hasPreviousStep && previousStepButton}
      {hasNextStep && nextStepButton}
      {!hasNextStep && saveButton}
    </EuiFlexGroup>
  );
};

Navigation.propTypes = {
  hasNextStep: PropTypes.bool.isRequired,
  hasPreviousStep: PropTypes.bool.isRequired,
  goToNextStep: PropTypes.func,
  goToPreviousStep: PropTypes.func,
  save: PropTypes.func.isRequired,
  canGoToNextStep: PropTypes.bool.isRequired,
};
