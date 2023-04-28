/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
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
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';
import { useKibanaNavigation } from '../../../../hooks/use_kibana_navigation';

export function SelectLogs() {
  const navigateToKibanaUrl = useKibanaNavigation();
  const { goToStep, getState, setState } = useWizard();

  function onBack() {
    navigateToKibanaUrl('/app/observabilityOnboarding');
  }

  return (
    <StepPanel title="Choose what logs to collect">
      <StepPanelContent>
        <LogsTypeSection title="Stream logs">
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="System logs"
                iconType="inspect"
                onClick={() => {}}
                isSelected={false}
                description="Monitor servers, personal computers, and more by collecting logs from your machines"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Stream log files"
                iconType="desktop"
                onClick={() => {
                  setState({ ...getState(), logsType: 'log-file' });
                  goToStep('configureLogs');
                }}
                isSelected={false}
                description="Example of a card’s description. Stick to one or two sentences."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </LogsTypeSection>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection title="Network streaming logs">
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Syslog"
                iconType="documents"
                onClick={() => {}}
                isSelected={false}
                description="Collect raw log data from listening ports."
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="HTTP Endpoint logs"
                iconType="documents"
                onClick={() => {}}
                isSelected={false}
                description="Collect JSON data from listening HTTP port."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </LogsTypeSection>
        <EuiSpacer size="m" />
        <EuiLink href="#/navigation/link" external>
          Explore other integrations
        </EuiLink>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection title="Other">
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Upload log files"
                iconType="exportAction"
                onClick={() => {}}
                isSelected={false}
                description="Upload data from a CSV, TSV, JSON or other log file type for analysis."
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Use my own shipper"
                iconType="package"
                onClick={() => {}}
                isSelected={false}
                description="Use your own shipper for your logs data collection by generating your own API key."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </LogsTypeSection>
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButton color="ghost" fill onClick={onBack}>
            Back
          </EuiButton>,
          <></>,
        ]}
      />
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
  isSelected,
  description,
}: {
  title: string;
  iconType: EuiIconProps['type'];
  onClick: () => void;
  isSelected: boolean;
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
      display={isSelected ? 'primary' : undefined}
      description={description}
    />
  );
}
