/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSteps,
  EuiSpacer,
} from '@elastic/eui';

export interface FlyoutContent {
  domainId: string;
  steps: string[];
}

interface Props {
  closeFlyout: () => void;
  flyoutContent: FlyoutContent;
}

const i18nTexts = {
  getFlyoutTitle: (domainId: string) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.stepsFlyout.flyoutTitle', {
      defaultMessage: `Fix '${domainId}' deprecation`,
      values: {
        domainId,
      },
    }),
  getStepTitle: (step: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.stepsFlyout.stepTitle', {
      defaultMessage: 'Step {step}',
      values: {
        step,
      },
    }),
  flyoutDescription: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.stepsFlyout.flyoutDescription',
    {
      defaultMessage: 'Follow the steps below to address this deprecation.',
    }
  ),
};

export const StepsFlyout: FunctionComponent<Props> = ({ closeFlyout, flyoutContent }) => {
  const { domainId, steps } = flyoutContent;

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutTitle" maxWidth={450}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{i18nTexts.getFlyoutTitle(domainId)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <>
          <EuiText>
            <p>{i18nTexts.flyoutDescription}</p>
          </EuiText>

          <EuiSpacer />

          <EuiSteps
            titleSize="xs"
            steps={steps.map((step, index) => {
              return {
                title: i18nTexts.getStepTitle(index + 1),
                children: (
                  <EuiText>
                    <p>{step}</p>
                  </EuiText>
                ),
              };
            })}
          />
        </>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
