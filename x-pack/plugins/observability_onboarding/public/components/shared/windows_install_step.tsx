/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const DEFAULT_STANDALONE_ELASTIC_AGENT_DOCS =
  'https://www.elastic.co/guide/en/fleet/current/install-standalone-elastic-agent.html';

export function WindowsInstallStep({
  docsLink = DEFAULT_STANDALONE_ELASTIC_AGENT_DOCS,
}: {
  docsLink?: string;
}) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.windows.installStep.description',
              {
                defaultMessage:
                  'This onboarding is currently only available for Linux and MacOS systems. See our documentation for information on streaming log files to Elastic from a Windows system.',
              }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconSide="right"
          iconType="popout"
          color="primary"
          href={docsLink}
          target="_blank"
          style={{ width: 'fit-content' }}
        >
          {i18n.translate(
            'xpack.observability_onboarding.windows.installStep.link.label',
            { defaultMessage: 'Read docs' }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
