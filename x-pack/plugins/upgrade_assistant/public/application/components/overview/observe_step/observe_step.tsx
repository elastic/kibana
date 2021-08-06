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

import { Collapsible } from './collapsible';
import { ExternalLinks } from './external_links';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { LogStream } from '../../../../../../infra/public';

const i18nTexts = {
  observeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.observeStepTitle', {
    defaultMessage: 'Observe deprecation logs',
  }),
  observeStepDescription: (href: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.observeStepDescription"
      defaultMessage="Collect and review the deprecation logs to see if your applications are using functionality that is not available in the next version. {deprecationLoggingLink} and how to manage them."
      values={{
        deprecationLoggingLink: (
          <EuiLink href={href} target="_blank">
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
  ),
};

export const getObserveStep = ({ docLinks }: { docLinks: DocLinksStart }): EuiStepProps => {
  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - 120 * 60 * 1000; // 2 hours

  return {
    title: i18nTexts.observeStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.observeStepDescription(docLinks.links.elasticsearch.deprecationLogging)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <DeprecationLoggingToggle />

        <EuiSpacer size="l" />

        <Collapsible renderFooter={<ExternalLinks />}>
          <LogStream
            height={200}
            sourceId="deprecation_logs"
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            columns={[
              { type: 'timestamp', header: false },
              { type: 'message', header: false },
            ]}
          />
        </Collapsible>
      </>
    ),
  };
};
