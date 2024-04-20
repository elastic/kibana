/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';

interface StepsNavProps {
  previousActive?: boolean;
  nextActive?: boolean;
  previous?(): void;
  next?(): void;
}

export const WizardNav = ({
  previous,
  previousActive = true,
  next,
  nextActive = true,
  children,
}: StepsNavProps) => (
  <Fragment>
    <EuiHorizontalRule />
    <EuiFlexGroup>
      {previous && (
        <EuiFlexItem grow={false}>
          <PreviousButton previous={previous} previousActive={previousActive} />
        </EuiFlexItem>
      )}
      {next && (
        <EuiFlexItem grow={false}>
          <NextButton next={next} nextActive={nextActive} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem />
    </EuiFlexGroup>
  </Fragment>
);

export const PreviousButton = ({ previous, previousActive = true }: StepsNavProps) => (
  <EuiButtonEmpty
    disabled={!previousActive}
    onClick={previous}
    iconType="arrowLeft"
    iconSide="left"
    data-test-subj="mlJobWizardNavButtonPrevious"
  >
    <FormattedMessage id="xpack.ml.newJob.wizard.previousStepButton" defaultMessage="Previous" />
  </EuiButtonEmpty>
);

export const NextButton = ({ next, nextActive = true }: StepsNavProps) => (
  <EuiButton
    fill
    disabled={!nextActive}
    onClick={next}
    iconSide="right"
    iconType="arrowRight"
    data-test-subj="mlJobWizardNavButtonNext"
  >
    <FormattedMessage id="xpack.ml.newJob.wizard.nextStepButton" defaultMessage="Next" />
  </EuiButton>
);
