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
                      { id: 'linux-tar', label: 'Linux Tar (user command)' },
                      { id: 'macos', label: 'MacOs (hosted script)' },
                      { id: 'windows', label: 'Windows (elastic-agent.yml)' },
                      // { id: 'deb', label: 'DEB' },
                      // { id: 'rpm', label: 'RPM' },
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
  'linux-tar': `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/elastic/install/HEAD/install.sh)" https://deploy-kibana-pr155821-custom.es.us-west2.gcp.elastic-cloud.com:443 SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  // 'linux-tar': `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  macos: `
#!/bin/bash

# Arguments
ELASTIC_HOST=$1
ELASTIC_TOKEN=$2

# download and extract Elastic Agent
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.7.0-linux-x86_64.tar.gz
tar xzvf elastic-agent-8.7.0-linux-x86_64.tar.gz
cd elastic-agent-8.7.0-linux-x86_64

# install Elastic Agent
sudo ./elastic-agent install --url=$ELASTIC_HOST --enrollment-token=$ELASTIC_TOKEN

INSTALL_EXIT_CODE=$?

# check the exit code to determine whether the installation was successful or not
if [ $INSTALL_EXIT_CODE -eq 0 ]; then
  INSTALL_RESULT="success"
else
  INSTALL_RESULT="failure"
fi

# call the API with the installation result
curl -X POST "$KIBANA_HOST/api/observabilityOnboarding/agent-installation-status?host=$ELASTIC_HOST&token=$ELASTIC_TOKEN&result=$INSTALL_RESULT"
  `.trim(),
  // macos: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  windows: `
outputs:
  default:
    type: elasticsearch
    hosts:
      - 'https://deploy-kibana-pr155821-custom.es.us-west2.gcp.elastic-cloud.com:443'
    api_key: _Nj4oH0aWZVGqM7MGop8:349p_U1ERHyIc4Nm8_AYkw

inputs:
  - id: asdklfjwlrkj
    type: logfile
    data_stream:
      namespace: default
    streams:
      - id: {generate-something-random}
        data_stream:
          dataset: {dataset}
        paths:
          - {path}
  `.trim(),
  // windows: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  deb: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
  rpm: `curl -O https://elastic.co/agent-setup.sh && sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==`,
} as const;
