/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import type { DocLinksStart } from 'src/core/public';

import { useDeprecationLogging } from './use_deprecation_logging';
import { Collapsible } from './collapsible';
import { ExternalLinks } from './external_links';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { LogStream } from '../../../../../../infra/public';
import { DEPRECATION_LOGS_SOURCE_ID } from '../../../../../common/constants';

const DeprecationLogsPreview = () => {
  const state = useDeprecationLogging();

  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - 120 * 60 * 1000; // 2 hours
  const showFooter = !state.fetchError && !state.isLoading && !state.isEnabled;

  return (
    <>
      <DeprecationLoggingToggle {...state} />

      <EuiSpacer size="l" />

      <Collapsible renderFooter={<ExternalLinks />} showFooter={showFooter}>
        {(() => {
          if (state.isLoading) {
            return <p>Is loading...</p>;
          }

          if (!state.isEnabled) {
            return <p>Is Disabled...</p>;
          }

          if (state.fetchError) {
            return <p>Has error...</p>;
          }

          return (
            <LogStream
              height={200}
              sourceId={DEPRECATION_LOGS_SOURCE_ID}
              startTimestamp={startTimestamp}
              endTimestamp={endTimestamp}
              columns={[
                { type: 'timestamp', header: false },
                { type: 'message', header: false },
              ]}
            />
          );
        })()}
      </Collapsible>
    </>
  );
};

export const getObserveStep = ({
  docLinks,
  currentMajor,
}: {
  docLinks: DocLinksStart;
  currentMajor: number;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.upgradeAssistant.overview.observeStepTitle', {
      defaultMessage: 'Log deprecated API usage and update your applications.',
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
