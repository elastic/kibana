/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
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
  const startTimestamp = endTimestamp - 1000 * 60 * 60 * 24 * 7; // 7 days
  const showFooter = state.isEnabled && (!state.fetchError || !state.isLoading);

  return (
    <>
      <DeprecationLoggingToggle {...state} />

      <EuiSpacer size="l" />

      <Collapsible renderFooter={<ExternalLinks />} showFooter={showFooter}>
        {(() => {
          if (state.isLoading) {
            return (
              <>
                <EuiFlexGroup
                  direction="column"
                  alignItems="center"
                  gutterSize="s"
                  justifyContent="center"
                  className="eui-fullHeight"
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.upgradeAssistant.overview.loadingDeprecationLogs"
                          defaultMessage="Loading deprecation logs"
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            );
          }

          if (!state.isEnabled || state.fetchError) {
            return (
              <>
                <EuiFlexGroup
                  direction="column"
                  alignItems="center"
                  gutterSize="s"
                  justifyContent="center"
                  className="eui-fullHeight"
                >
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.upgradeAssistant.overview.emptyDeprecationLogs"
                          defaultMessage="Deprecation logs will appear here when collected."
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            );
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
              hasColumnHeaders={false}
            />
          );
        })()}
      </Collapsible>
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
