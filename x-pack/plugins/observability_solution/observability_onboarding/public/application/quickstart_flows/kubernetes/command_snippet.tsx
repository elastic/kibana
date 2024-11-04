/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { buildKubectlCommand } from './build_kubectl_command';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';

interface Props {
  encodedApiKey: string;
  onboardingId: string;
  elasticsearchUrl: string;
  elasticAgentVersion: string;
  isCopyPrimaryAction: boolean;
}

export function CommandSnippet({
  encodedApiKey,
  onboardingId,
  elasticsearchUrl,
  elasticAgentVersion,
  isCopyPrimaryAction,
}: Props) {
  const command = buildKubectlCommand({
    encodedApiKey,
    onboardingId,
    elasticsearchUrl,
    elasticAgentVersion,
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.kubernetesPanel.installElasticAgentDescription"
            defaultMessage="Copy and run the install command. Note that the following manifest contains resource limits that may not be appropriate for a production environment, review our guide on {scalingLink} before deploying this manifest."
            values={{
              scalingLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingKubernetesPanelScalingElasticAgentOnKubernetesLink"
                  href="https://www.elastic.co/guide/en/fleet/current/scaling-on-kubernetes.html"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.kubernetesPanel.scalingElasticAgentOnLinkLabel',
                    { defaultMessage: 'Scaling Elastic Agent on Kubernetes' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiCodeBlock language="text" paddingSize="m" fontSize="m">
        {command}
      </EuiCodeBlock>

      <EuiSpacer />

      <CopyToClipboardButton textToCopy={command} fill={isCopyPrimaryAction} />
    </>
  );
}
