/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiSteps,
  EuiCodeBlock,
  EuiButton,
  EuiSpacer,
  EuiSkeletonText,
  EuiToolTip,
  copyToClipboard,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { getAutoDetectCommand } from './get_auto_detect_command';
import { useOnboardingFlow } from './use_onboarding_flow';
import { ProgressIndicator } from './progress_indicator';
import { AccordionWithIcon } from './accordion_with_icon';
import { ObservabilityOnboardingContextValue } from '../../../plugin';
import { EmptyPrompt } from './empty_prompt';
import { isRegistryIntegration, isCustomIntegration } from './get_installed_integrations';

export const AutoDetectPanel: FunctionComponent = () => {
  const {
    services: { share, http },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const { status, data, error, refetch, installedIntegrations } = useOnboardingFlow();
  const command = data ? getAutoDetectCommand(data) : undefined;
  const [isTextCopied, setTextCopied] = useState(false);

  if (error) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const registryIntegrations = installedIntegrations.filter(isRegistryIntegration);
  const customIntegrations = installedIntegrations.filter(isCustomIntegration);

  const singleDatasetLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);

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
                <EuiToolTip
                  content={
                    isTextCopied
                      ? i18n.translate(
                          'xpack.observability_onboarding.autoDetectPanel.copiedToClipboardTooltip',
                          {
                            defaultMessage: 'Command copied',
                          }
                        )
                      : null
                  }
                >
                  <EuiButton
                    data-test-subj="observabilityOnboardingAutoDetectPanelCopyToClipboardButton"
                    onBlur={() => setTextCopied(false)}
                    onMouseLeave={() => setTextCopied(false)}
                    onClick={() => {
                      if (command) {
                        copyToClipboard(command);
                        setTextCopied(true);
                      }
                    }}
                    isDisabled={!command}
                    iconType="copyClipboard"
                    color="primary"
                    fill={status === 'notStarted'}
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.autoDetectPanel.copyToClipboardButtonLabel',
                      { defaultMessage: 'Copy to clipboard' }
                    )}
                  </EuiButton>
                </EuiToolTip>
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
                        id={integration.pkgName}
                        iconType="desktop"
                        title={i18n.translate(
                          'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithNginxLabel',
                          {
                            defaultMessage: 'Get started with {pkgName} logs',
                            values: { pkgName: integration.pkgName },
                          }
                        )}
                        isDisabled={status !== 'dataReceived'}
                        initialIsOpen
                      >
                        <EuiFlexGroup responsive={false}>
                          <EuiFlexItem grow={false}>
                            <img
                              src={http.staticAssets.getPluginAssetHref('charts_screen.svg')}
                              width={162}
                              height={117}
                              alt=""
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <div>
                              <EuiButtonEmpty
                                data-test-subj="observabilityOnboardingAutoDetectPanelExploreLogsButton"
                                onClick={() => {
                                  singleDatasetLocator?.navigate({
                                    dataset: integration.pkgName,
                                  });
                                }}
                                isDisabled={status !== 'dataReceived'}
                                flush="both"
                                size="s"
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.autoDetectPanel.exploreLogsButtonEmptyLabel',
                                  {
                                    defaultMessage: 'Explore {pkgName} logs',
                                    values: { pkgName: integration.pkgName },
                                  }
                                )}
                              </EuiButtonEmpty>
                            </div>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </AccordionWithIcon>
                    ))}
                    {customIntegrations.length > 0 && (
                      <AccordionWithIcon
                        id="custom"
                        iconType="documents"
                        title={i18n.translate(
                          'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithlogLabel',
                          { defaultMessage: 'Get started with custom .log files' }
                        )}
                        isDisabled={status !== 'dataReceived'}
                        initialIsOpen
                      >
                        <ul>
                          {customIntegrations.map((integration) => (
                            <li key={integration.pkgName}>
                              <EuiButtonEmpty
                                data-test-subj="observabilityOnboardingAutoDetectPanelButton"
                                iconType="document"
                                onClick={() => {
                                  singleDatasetLocator?.navigate({
                                    dataset: integration.pkgName,
                                  });
                                }}
                                isDisabled={status !== 'dataReceived'}
                                flush="both"
                                size="s"
                              >
                                {integration?.logFilePaths?.[0] ?? integration.pkgName}
                              </EuiButtonEmpty>
                            </li>
                          ))}
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
