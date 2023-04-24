/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren, useState } from 'react';
import {
  EuiTitle,
  EuiText,
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

export function ConfigureLogs() {
  const { goToStep, goBack, getState, setState } = useWizard();
  const wizardState = getState();
  const [logsType, setLogsType] = useState(wizardState.logsType);
  const [uploadType, setUploadType] = useState(wizardState.uploadType);

  function onContinue() {
    if (logsType && uploadType) {
      setState({ ...getState(), logsType, uploadType });
      goToStep('installElasticAgent');
    }
  }

  function createLogsTypeToggle(type: NonNullable<typeof logsType>) {
    return () => {
      if (type === logsType) {
        setLogsType(undefined);
      } else {
        setLogsType(type);
      }
    };
  }

  function createUploadToggle(type: NonNullable<typeof uploadType>) {
    return () => {
      if (type === uploadType) {
        setUploadType(undefined);
      } else {
        setUploadType(type);
      }
    };
  }

  function onBack() {
    goBack();
  }

  return (
    <StepPanel title="Choose what logs to collect">
      <StepPanelContent>
        <LogsTypeSection
          title="System logs"
          description="The quickest way to start using Elastic is to start uploading logs from your system."
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Stream system logs"
                iconType="document"
                onClick={createLogsTypeToggle('system')}
                isSelected={logsType === 'system'}
              />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </LogsTypeSection>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection
          title="Custom logs"
          description="Stream custom logs files from your data sink to Elastic."
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Stream sys logs"
                iconType="package"
                onClick={createLogsTypeToggle('sys')}
                isSelected={logsType === 'sys'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Stream HTTP Endpoint logs"
                iconType="package"
                onClick={createLogsTypeToggle('http-endpoint')}
                isSelected={logsType === 'http-endpoint'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </LogsTypeSection>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection title="Stream logs" description="Lorem ipsum">
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Stream log file"
                iconType="document"
                onClick={createLogsTypeToggle('log-file')}
                isSelected={logsType === 'log-file'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Send it from my service"
                iconType="document"
                onClick={createLogsTypeToggle('service')}
                isSelected={logsType === 'service'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </LogsTypeSection>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection
          title="Log files"
          description="Upload your custom logs files to start analyzing it with Elastic."
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Upload log file"
                iconType="document"
                onClick={createUploadToggle('log-file')}
                isSelected={uploadType === 'log-file'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Get an API key"
                iconType="document"
                onClick={createUploadToggle('api-key')}
                isSelected={uploadType === 'api-key'}
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
          <EuiButton
            color="primary"
            fill
            onClick={onContinue}
            isDisabled={!(logsType && uploadType)}
          >
            Continue
          </EuiButton>,
        ]}
      />
    </StepPanel>
  );
}

function LogsTypeSection({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <>
      <EuiTitle size="s">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued">
        <p>{description}</p>
      </EuiText>
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
}: {
  title: string;
  iconType: EuiIconProps['type'];
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon type={iconType} size="l" />}
      title={title}
      titleSize="xs"
      paddingSize="m"
      style={{ height: 56 }}
      onClick={onClick}
      hasBorder={true}
      display={isSelected ? 'primary' : undefined}
    />
  );
}
