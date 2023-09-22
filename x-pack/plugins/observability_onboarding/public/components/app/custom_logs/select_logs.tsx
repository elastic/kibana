/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import React, { PropsWithChildren, MouseEvent } from 'react';
import {
  EuiTitle,
  EuiLink,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../shared/step_panel';
import { useWizard } from '.';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';

export function SelectLogs() {
  const { navigateToKibanaUrl, navigateToAppUrl } = useKibanaNavigation();
  const { goToStep, setState } = useWizard();

  function onBack() {
    navigateToKibanaUrl('/app/observabilityOnboarding');
  }

  return (
    <StepPanel
      title={i18n.translate(
        'xpack.observability_onboarding.selectLogs.chooseType',
        {
          defaultMessage: 'What logs do you want to collect?',
        }
      )}
      panelFooter={
        <StepPanelFooter
          items={[
            <EuiButton
              data-test-subj="observabilityOnboardingSelectLogsBackButton"
              color="text"
              onClick={onBack}
            >
              {i18n.translate('xpack.observability_onboarding.steps.back', {
                defaultMessage: 'Back',
              })}
            </EuiButton>,
            <></>,
          ]}
        />
      }
    >
      <StepPanelContent>
        <EuiFlexGroup>
          <EuiFlexItem grow={false} style={{ width: '50%' }}>
            <OptionCard
              title={i18n.translate(
                'xpack.observability_onboarding.selectLogs.streamLogFiles',
                {
                  defaultMessage: 'Stream log files',
                }
              )}
              iconType="desktop"
              onClick={() => {
                setState((state) => ({ ...state, logsType: 'log-file' }));
                goToStep('configureLogs');
              }}
              description={i18n.translate(
                'xpack.observability_onboarding.selectLogs.streamLogFiles.description',
                {
                  defaultMessage: 'Stream your log file or directory.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection
          title={i18n.translate(
            'xpack.observability_onboarding.selectLogs.networkStreamingLogs',
            {
              defaultMessage: 'Network streaming logs',
            }
          )}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.sysLog',
                  {
                    defaultMessage: 'TCP/UDP/Syslog',
                  }
                )}
                iconType="documents"
                onClick={() => {}}
                description={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.sysLog.description',
                  {
                    defaultMessage:
                      'Stream logs over TCP or UDP ports or from your syslog server.',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.httpEndpointLogs',
                  {
                    defaultMessage: 'HTTP Endpoint',
                  }
                )}
                iconType="documents"
                onClick={() => {}}
                description={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.httpEndpointLogs.description',
                  {
                    defaultMessage:
                      'Collect JSON data from listening HTTP port.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </LogsTypeSection>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection
          title={i18n.translate(
            'xpack.observability_onboarding.selectLogs.other',
            {
              defaultMessage: 'Other',
            }
          )}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.uploadLogFiles',
                  {
                    defaultMessage: 'Upload log files',
                  }
                )}
                iconType="exportAction"
                onClick={() => {}}
                description={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.uploadLogFiles.description',
                  {
                    defaultMessage:
                      'Upload data from a CSV, TSV, JSON or other log file type for analysis.',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.useOwnShipper',
                  {
                    defaultMessage: 'Get an API key',
                  }
                )}
                iconType="package"
                onClick={() => {}}
                description={i18n.translate(
                  'xpack.observability_onboarding.selectLogs.useOwnShipper.description',
                  {
                    defaultMessage:
                      'Use your own shipper to collect logs data by generating an API key.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiLink
            data-test-subj="observabilityOnboardingSelectLogsExploreOtherIntegrationsLink"
            href="#"
            target="_blank"
            onClick={(event: MouseEvent) => {
              event.preventDefault();
              navigateToAppUrl('/integrations/browse/observability');
            }}
          >
            {i18n.translate(
              'xpack.observability_onboarding.exploreOtherIntegrations',
              {
                defaultMessage: 'Explore other integrations',
              }
            )}
          </EuiLink>
        </LogsTypeSection>
      </StepPanelContent>
    </StepPanel>
  );
}

function LogsTypeSection({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <>
      <EuiTitle size="s">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {children}
    </>
  );
}

function OptionCard({
  title,
  iconType,
  onClick,
  description,
}: {
  title: string;
  iconType: EuiIconProps['type'];
  onClick: () => void;
  description: string;
}) {
  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon type={iconType} size="l" />}
      title={title}
      titleSize="xs"
      paddingSize="m"
      onClick={onClick}
      hasBorder={true}
      description={description}
    />
  );
}
