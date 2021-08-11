/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiText, EuiSpacer, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import type { DocLinksStart } from 'src/core/public';

import { useDeprecationLogging } from './use_deprecation_logging';
// import { ExternalLinks } from './external_links';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

const DeprecationLogsPreview: FunctionComponent = () => {
  const state = useDeprecationLogging();

  return (
    <>
      <EuiPanel>
        <DeprecationLoggingToggle {...state} />
      </EuiPanel>

      <EuiSpacer size="l" />
    </>
  );
};

interface Props {
  docLinks: DocLinksStart;
  currentMajor: number;
}

export const getObserveStep = ({ docLinks, currentMajor }: Props): EuiStepProps => {
  return {
    title: i18n.translate('xpack.upgradeAssistant.overview.observeStepTitle', {
      defaultMessage: 'Identify deprecated API use and update your applications',
    }),
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.observeStepDescription"
              defaultMessage="See if you are using any features that aren't available in {currentMajor}.0. {deprecationLoggingLink} and how to manage them."
              values={{
                currentMajor,
                deprecationLoggingLink: (
                  <EuiLink href={docLinks.links.elasticsearch.deprecationLogging} target="_blank">
                    {i18n.translate(
                      'xpack.upgradeAssistant.deprecationLoggingDescription.observeStepDescriptionLink',
                      {
                        defaultMessage: 'Learn more about deprecation logs',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <DeprecationLogsPreview />
      </>
    ),
  };
};
