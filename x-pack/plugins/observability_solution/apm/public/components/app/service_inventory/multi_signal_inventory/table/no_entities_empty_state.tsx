/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiButton,
  EuiImage,
  EuiHorizontalRule,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { dashboardsLight } from '@kbn/shared-svg';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';

export function NoEntitiesEmptyState() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  return (
    <EuiEmptyPrompt
      hasShadow={false}
      icon={<EuiImage float="right" size="fullWidth" src={dashboardsLight} alt="" />}
      title={
        <h2>
          {i18n.translate('xpack.apm.noEntitiesEmptyState.title', {
            defaultMessage: 'No services available.',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <div css={{ width: 620, textAlign: 'left' }}>
          <p>
            {i18n.translate('xpack.apm.noEntitiesEmptyState.body.description', {
              defaultMessage:
                'The services inventory provides an overview of the health and general performance of your services. To add data to this page, instrument your services using the APM agent or detect services from your logs.',
            })}
          </p>

          <EuiHorizontalRule margin="m" />
          <EuiText textAlign="left">
            <h5>
              <EuiTextColor color="default">
                {i18n.translate('xpack.apm.noEntitiesEmptyState.actions.title', {
                  defaultMessage: 'Start observing your services:',
                })}
              </EuiTextColor>
            </h5>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup responsive={false} wrap gutterSize="s" direction="row" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="apmNotEntitiesEmptyStateAddAgentButton"
                size="s"
                target="_blank"
                href={basePath.prepend('/app/observabilityOnboarding/?category=apm')}
              >
                {i18n.translate('xpack.apm.add.apmAgent.', {
                  defaultMessage: 'Add APM agent',
                })}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="apmNotEntitiesEmptyStateAssociateLogsButton"
                size="s"
                target="_blank"
                href="https://ela.st/new-experience-associate-service-logs"
              >
                {i18n.translate('xpack.apm.noEntitiesEmptyState.associate.logs', {
                  defaultMessage: 'Associate existing service logs',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="apmNotEntitiesEmptyStateCollectLogsButton"
                size="s"
                target="_blank"
                href={basePath.prepend('/app/observabilityOnboarding/?category=logs')}
              >
                {i18n.translate('xpack.apm.noEntitiesEmptyState.collect.logs', {
                  defaultMessage: 'Collect new service logs',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiSpacer size="l" />

            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.noEntitiesEmptyState.euiCallOut.checkItOutHeresLabel',
                {
                  defaultMessage: 'Trying for the first time?',
                }
              )}
              iconType="search"
            >
              <p>
                {i18n.translate('xpack.apm.noEntitiesEmptyState.euiCallOut.checkItOutHeresLabel', {
                  defaultMessage:
                    'It can take up to a minute for your services to show. Try refreshing the page in a minute.',
                })}
              </p>
            </EuiCallOut>
          </EuiFlexGroup>
        </div>
      }
    />
  );
}
