/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

const ONBOARDING_APP_ID = 'observabilityOnboarding';
const OTEL_APM_PATH = '/otel-apm';

const ASK_AI_PROMPT = i18n.translate('xpack.apm.missingDataCallout.assistantPrompt', {
  defaultMessage:
    'I have services missing from the APM Service Inventory. Help me instrument my applications using the managed OTLP endpoint on serverless so they start sending traces, metrics, and logs to Elastic.',
});

export function MissingDataCallout() {
  const {
    core: { application, docLinks },
    agentBuilder,
  } = useApmPluginContext();

  const docsUrl = docLinks.links.fleet.managedOtlp;

  const isAssistantAvailable = Boolean(agentBuilder?.openChat);

  const onSetupClick = useCallback(() => {
    application.navigateToApp(ONBOARDING_APP_ID, { path: OTEL_APM_PATH });
  }, [application]);

  const onAskAiClick = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: ASK_AI_PROMPT,
      autoSendInitialMessage: true,
    });
  }, [agentBuilder]);

  return (
    <EuiCallOut
      data-test-subj="apmMissingDataCallout"
      color="primary"
      iconType="info"
      title={i18n.translate('xpack.apm.missingDataCallout.title', {
        defaultMessage: 'Do you miss some data?',
      })}
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.apm.missingDataCallout.description"
            defaultMessage="If some of your services are missing, they may not be instrumented yet. Send your logs, metrics, and traces to Elastic through the {managedOtlpLink} — no collector to host or manage."
            values={{
              managedOtlpLink: (
                <EuiLink
                  data-test-subj="apmMissingDataCalloutDocsLink"
                  href={docsUrl}
                  target="_blank"
                  external
                >
                  {i18n.translate('xpack.apm.missingDataCallout.docsLinkLabel', {
                    defaultMessage: 'managed OTLP endpoint',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        {isAssistantAvailable && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="apmMissingDataCalloutAskAi"
              size="s"
              fill
              iconType="sparkles"
              onClick={onAskAiClick}
            >
              {i18n.translate('xpack.apm.missingDataCallout.askAiButton', {
                defaultMessage: 'Ask AI how to fix this',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="apmMissingDataCalloutSetup"
            size="s"
            iconType="plusInCircle"
            onClick={onSetupClick}
          >
            {i18n.translate('xpack.apm.missingDataCallout.setupButton', {
              defaultMessage: 'Set up OpenTelemetry',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
