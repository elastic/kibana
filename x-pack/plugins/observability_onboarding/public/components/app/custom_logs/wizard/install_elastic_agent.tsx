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
  EuiButtonGroup,
  EuiCodeBlock,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';

export function InstallElasticAgent() {
  const { goToStep, goBack, getState, setState } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] = useState(
    wizardState.elasticAgentPlatform
  );
  const [alternativeShippers, setAlternativeShippers] = useState(
    wizardState.alternativeShippers
  );

  function onContinue() {
    setState({ ...getState(), elasticAgentPlatform, alternativeShippers });
    goToStep('importData');
  }

  function createAlternativeShipperToggle(
    type: NonNullable<keyof typeof alternativeShippers>
  ) {
    return () => {
      setAlternativeShippers({
        ...alternativeShippers,
        [type]: !alternativeShippers[type],
      });
    };
  }

  function onBack() {
    goBack();
  }

  return (
    <StepPanel title="Install the Elastic Agent">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            Select a platform and run the command to install, enroll, and start
            the Elastic Agent. Do this for each host. For other platforms, see
            our downloads page. Review host requirements and other installation
            options.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          isFullWidth
          legend="Choose platform"
          options={[
            { id: 'linux-tar', label: 'Linux Tar' },
            { id: 'macos', label: 'MacOs' },
            { id: 'windows', label: 'Windows' },
            { id: 'deb', label: 'DEB' },
            { id: 'rpm', label: 'RPM' },
          ]}
          type="single"
          idSelected={elasticAgentPlatform}
          onChange={(id: string) =>
            setElasticAgentPlatform(id as typeof elasticAgentPlatform)
          }
        />
        <EuiSpacer size="m" />
        <EuiCodeBlock language="html" isCopyable>
          {PLATFORM_COMMAND[elasticAgentPlatform]}
        </EuiCodeBlock>
        <EuiHorizontalRule margin="l" />
        <LogsTypeSection title="Or select alternative shippers" description="">
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Filebeat"
                iconType="document"
                onClick={createAlternativeShipperToggle('filebeat')}
                isSelected={alternativeShippers.filebeat}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="fluentbit"
                iconType="package"
                onClick={createAlternativeShipperToggle('fluentbit')}
                isSelected={alternativeShippers.fluentbit}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <OptionCard
                title="Logstash"
                iconType="logstashIf"
                onClick={createAlternativeShipperToggle('logstash')}
                isSelected={alternativeShippers.logstash}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <OptionCard
                title="Fluentd"
                iconType="package"
                onClick={createAlternativeShipperToggle('fluentd')}
                isSelected={alternativeShippers.fluentd}
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
          <EuiButton color="primary" fill onClick={onContinue}>
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

const PLATFORM_COMMAND = {
  'linux-tar': `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  macos: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  windows: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  deb: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  rpm: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
} as const;
