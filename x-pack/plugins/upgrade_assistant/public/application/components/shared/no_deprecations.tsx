/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const i18nTexts = {
  getEmptyPromptTitle: (deprecationType: string) =>
    i18n.translate('xpack.upgradeAssistant.noDeprecationsPrompt.description', {
      defaultMessage: 'Your {deprecationType} configuration is up to date',
      values: {
        deprecationType,
      },
    }),
  getEmptyPromptDescription: (navigateToOverviewPage: () => void) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.noDeprecationsPrompt.nextStepsDescription"
      defaultMessage="Check the {overviewButton} for other Stack deprecations."
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
      iconType="check"
      data-test-subj="noDeprecationsPrompt"
      title={<h2>{i18nTexts.getEmptyPromptTitle(deprecationType)}</h2>}
      body={
        <>
          <p data-test-subj="upgradeAssistantIssueSummary">
            {i18nTexts.getEmptyPromptDescription(navigateToOverviewPage)}
          </p>
        </>
      }
    />
  );
};
