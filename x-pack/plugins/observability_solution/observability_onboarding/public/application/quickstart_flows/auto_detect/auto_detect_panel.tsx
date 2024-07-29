/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiSteps,
  EuiCodeBlock,
  EuiSpacer,
  EuiSkeletonText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useGeneratedHtmlId,
  EuiIcon,
} from '@elastic/eui';
import {
  type SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { getAutoDetectCommand } from './get_auto_detect_command';
import { DASHBOARDS, useOnboardingFlow } from './use_onboarding_flow';
import { ProgressIndicator } from '../shared/progress_indicator';
import { AccordionWithIcon } from '../shared/accordion_with_icon';
import { EmptyPrompt } from '../shared/empty_prompt';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { LocatorButtonEmpty } from '../shared/locator_button_empty';
import { GetStartedPanel } from '../shared/get_started_panel';
import { isSupportedLogo, LogoIcon } from '../../shared/logo_icon';

export const AutoDetectPanel: FunctionComponent = () => {
  const { status, data, error, refetch, installedIntegrations } = useOnboardingFlow();
  const command = data ? getAutoDetectCommand(data) : undefined;
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });

  if (error) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const registryIntegrations = installedIntegrations.filter(
    (integration) => integration.installSource === 'registry'
  );
  const customIntegrations = installedIntegrations.filter(
    (integration) => integration.installSource === 'custom'
  );

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.runTheCommandOnLabel',
              { defaultMessage: 'Run the command on your host' }
            ),
            status: status === 'notStarted' ? 'current' : 'complete',
            children: command ? (
              <>
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.autoDetectPanel.p.wellScanYourHostLabel',
                      {
                        defaultMessage: "We'll scan your host for logs and metrics, including:",
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s">
                  {['Apache', 'Docker', 'Nginx', 'System', 'Custom .log files'].map((item) => (
                    <EuiFlexItem key={item} grow={false}>
                      <EuiBadge color="hollow">{item}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
                <EuiSpacer />
                {/* Bash syntax highlighting only highlights a few random numbers (badly) so it looks less messy to go with plain text */}
                <EuiCodeBlock paddingSize="m" language="text">
                  {command}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton textToCopy={command} fill={status === 'notStarted'} />
              </>
            ) : (
              <EuiSkeletonText lines={6} />
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.visualizeYourDataLabel',
              { defaultMessage: 'Visualize your data' }
            ),
            status:
              status === 'dataReceived'
                ? 'complete'
                : status === 'awaitingData' || status === 'inProgress'
                ? 'current'
                : 'incomplete',
            children: (
              <>
                {status === 'dataReceived' ? (
                  <ProgressIndicator
                    iconType="cheer"
                    title={i18n.translate(
                      'xpack.observability_onboarding.autoDetectPanel.yourDataIsReadyToExploreLabel',
                      { defaultMessage: 'Your data is ready to explore!' }
                    )}
                    isLoading={false}
                  />
                ) : status === 'awaitingData' ? (
                  <ProgressIndicator
                    title={i18n.translate(
                      'xpack.observability_onboarding.autoDetectPanel.installingElasticAgentFlexItemLabel',
                      { defaultMessage: 'Waiting for data to arrive...' }
                    )}
                  />
                ) : status === 'inProgress' ? (
                  <ProgressIndicator
                    title={i18n.translate(
                      'xpack.observability_onboarding.autoDetectPanel.lookingForLogFilesFlexItemLabel',
                      { defaultMessage: 'Waiting for installation to complete...' }
                    )}
                  />
                ) : null}
                {(status === 'awaitingData' || status === 'dataReceived') &&
                installedIntegrations.length > 0 ? (
                  <>
                    <EuiSpacer />
                    {registryIntegrations.map((integration) => (
                      <AccordionWithIcon
                        key={integration.pkgName}
                        id={`${accordionId}_${integration.pkgName}`}
                        icon={
                          isSupportedLogo(integration.pkgName) ? (
                            <LogoIcon size="l" logo={integration.pkgName} />
                          ) : (
                            <EuiIcon type="desktop" size="l" />
                          )
                        }
                        title={i18n.translate(
                          'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithNginxLabel',
                          {
                            defaultMessage: 'Get started with {title}',
                            values: { title: integration.title },
                          }
                        )}
                        isDisabled={status !== 'dataReceived'}
                        initialIsOpen
                      >
                        <GetStartedPanel
                          integration={integration.pkgName}
                          newTab
                          isLoading={status !== 'dataReceived'}
                          dashboardLinks={integration.kibanaAssets
                            .filter((asset) => asset.type === 'dashboard')
                            .map((asset) => {
                              const dashboard = DASHBOARDS[asset.id as keyof typeof DASHBOARDS];

                              return {
                                id: asset.id,
                                title:
                                  dashboard.type === 'metrics'
                                    ? i18n.translate(
                                        'xpack.observability_onboarding.autoDetectPanel.exploreMetricsDataTitle',
                                        {
                                          defaultMessage:
                                            'Overview your metrics data with this pre-made dashboard',
                                        }
                                      )
                                    : i18n.translate(
                                        'xpack.observability_onboarding.autoDetectPanel.exploreLogsDataTitle',
                                        {
                                          defaultMessage:
                                            'Overview your logs data with this pre-made dashboard',
                                        }
                                      ),
                                label:
                                  dashboard.type === 'metrics'
                                    ? i18n.translate(
                                        'xpack.observability_onboarding.autoDetectPanel.exploreMetricsDataLabel',
                                        {
                                          defaultMessage: 'Explore metrics data',
                                        }
                                      )
                                    : i18n.translate(
                                        'xpack.observability_onboarding.autoDetectPanel.exploreLogsDataLabel',
                                        {
                                          defaultMessage: 'Explore logs data',
                                        }
                                      ),
                              };
                            })}
                        />
                      </AccordionWithIcon>
                    ))}
                    {customIntegrations.length > 0 && (
                      <AccordionWithIcon
                        id={`${accordionId}_custom`}
                        icon={<EuiIcon type="documents" size="l" />}
                        title={i18n.translate(
                          'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithlogLabel',
                          { defaultMessage: 'Get started with custom .log files' }
                        )}
                        isDisabled={status !== 'dataReceived'}
                        initialIsOpen
                      >
                        <ul>
                          {customIntegrations.map((integration) =>
                            integration.dataStreams.map((datastream) => (
                              <li key={`${integration.pkgName}/${datastream.dataset}`}>
                                <LocatorButtonEmpty<SingleDatasetLocatorParams>
                                  locator={SINGLE_DATASET_LOCATOR_ID}
                                  params={{
                                    integration: integration.pkgName,
                                    dataset: datastream.dataset,
                                  }}
                                  target="_blank"
                                  iconType="document"
                                  isDisabled={status !== 'dataReceived'}
                                  flush="left"
                                  size="s"
                                >
                                  {integration.pkgName}
                                </LocatorButtonEmpty>
                              </li>
                            ))
                          )}
                        </ul>
                      </AccordionWithIcon>
                    )}
                  </>
                ) : null}
              </>
            ),
          },
        ]}
      />
    </EuiPanel>
  );
};
