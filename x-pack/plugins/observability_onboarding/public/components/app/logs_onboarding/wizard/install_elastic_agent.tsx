/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiSteps,
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

  function onContinue() {
    setState({ ...getState(), elasticAgentPlatform });
    goToStep('importData');
  }

  function onBack() {
    goBack();
  }

  return (
    <StepPanel title="Install shipper to collect data">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            Add Elastic Agent to your hosts to begin sending data to your
            Elastic Cloud. Run standalone if you want to download and manage
            each agent configuration file on your own, or enroll in Fleet, for
            centralized management of all your agents through our Fleet managed
            interface.
          </p>
        </EuiText>

        <EuiSpacer size="m" />
        <EuiSteps
          headingElement="h2"
          steps={[
            {
              title: 'Install the Elastic Agent',
              children: (
                <>
                  <EuiText color="subdued">
                    <p>
                      Select a platform and run the command to install, enroll,
                      and start the Elastic Agent. Do this for each host. For
                      other platforms, see our downloads page. Review host
                      requirements and other installation options.
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
                </>
              ),
            },
          ]}
        />
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

const PLATFORM_COMMAND = {
  'linux-tar': `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  macos: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  windows: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  deb: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  rpm: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
} as const;
