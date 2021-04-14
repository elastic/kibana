/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const i18nTexts = {
  emptyPromptTitle: i18n.translate('xpack.upgradeAssistant.noDeprecationsPrompt.title', {
    defaultMessage: 'All clear!',
  }),
  getEmptyPromptDescription: (deprecationType: string) =>
    i18n.translate('xpack.upgradeAssistant.noDeprecationsPrompt.description', {
      defaultMessage: 'You have no {deprecationType} issues.',
      values: {
        deprecationType,
      },
    }),
  getEmptyPromptNextStepsDescription: (navigateToOverviewPage: () => void) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.noDeprecationsPrompt.nextStepsDescription"
      defaultMessage="Check the {overviewButton} for next steps."
      values={{
        overviewButton: (
          <EuiLink onClick={navigateToOverviewPage}>
            {i18n.translate('xpack.upgradeAssistant.noDeprecationsPrompt.overviewLinkText', {
              defaultMessage: 'Overview page',
            })}
          </EuiLink>
        ),
      }}
    />
  ),
};

interface Props {
  deprecationType: string;
  navigateToOverviewPage: () => void;
}

export const NoDeprecationsPrompt: FunctionComponent<Props> = ({
  deprecationType,
  navigateToOverviewPage,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="faceHappy"
      data-test-subj="noDeprecationsPrompt"
      title={<h2>{i18nTexts.emptyPromptTitle}</h2>}
      body={
        <>
          <p data-test-subj="upgradeAssistantIssueSummary">
            {i18nTexts.getEmptyPromptDescription(deprecationType)}
          </p>
          <p>{i18nTexts.getEmptyPromptNextStepsDescription(navigateToOverviewPage)}</p>
        </>
      }
    />
  );
};
