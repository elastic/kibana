/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormErrorText,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useQuickStartCreateForm } from '../hooks';
import { useKibanaVersion, useLink } from '../../../hooks';

// TODO: Move me 🙂
import { PlatformSelector } from '../../enrollment_instructions/manual/platform_selector';

const ARTIFACT_BASE_URL = 'https://artifacts.elastic.co/downloads/beats/elastic-agent';

export const QuickStartTab: React.FunctionComponent = () => {
  const [fleetServerHost, setFleetServerHost] = useState('');
  const quickStartCreateForm = useQuickStartCreateForm();

  const kibanaVersion = useKibanaVersion();
  const { getHref } = useLink();

  const commands = useMemo(
    () => ({
      macos: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `sudo ./elastic-agent install \\
  --fleet-server-es=http://192.0.2.0:9200 \\
  --fleet-server-service-token=${quickStartCreateForm.serviceToken}`,
      ].join('\n'),
      linux: 'To-Do',
      windows: 'To-Do',
      deb: 'To-Do',
      rpm: 'To-Do',
    }),
    [kibanaVersion, quickStartCreateForm.serviceToken]
  );

  const steps = useMemo<EuiStepProps[]>(() => {
    return [
      {
        title: i18n.translate('xpack.fleet.fleetServerFlyout.getStartedTitle', {
          defaultMessage: 'Get started with Fleet Server',
        }),
        status: quickStartCreateForm.status === 'success' ? 'complete' : 'current',
        children:
          quickStartCreateForm.status === 'success' ? (
            <EuiCallOut
              color="success"
              iconType="check"
              title={i18n.translate(
                'xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessTitle',
                { defaultMessage: 'Fleet Server policy created.' }
              )}
            >
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessInstructions"
                  defaultMessage="Fleet server policy and service token have been generated. Host configured at  {hostUrl}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
                  values={{
                    hostUrl: <EuiCode>{fleetServerHost}</EuiCode>,
                    fleetSettingsLink: (
                      <EuiLink href={getHref('settings')}>
                        <FormattedMessage
                          id="xpack.fleet.fleetServerSetup.fleetSettingsLink"
                          defaultMessage="Fleet Settings"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiCallOut>
          ) : (
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.fleetServerFlyout.getStartedInstructions"
                  defaultMessage="First, set the public IP or host name and port that agents will use to reach Fleet Server. It uses port {port} by default. We'll then generate a policy for you automatically."
                />
              </EuiText>

              <EuiSpacer size="m" />

              <EuiForm onSubmit={() => quickStartCreateForm.submit(fleetServerHost)}>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFieldText
                      fullWidth
                      placeholder={'https://fleet-server-host.com:8220'}
                      value={fleetServerHost}
                      isInvalid={!!quickStartCreateForm.error}
                      onChange={(e) => setFleetServerHost(e.target.value)}
                      disabled={quickStartCreateForm.status === 'loading'}
                      prepend={
                        <EuiText>
                          <FormattedMessage
                            id="xpack.fleet.fleetServerSetup.addFleetServerHostInputLabel"
                            defaultMessage="Fleet Server host"
                          />
                        </EuiText>
                      }
                      data-test-subj="fleetServerHostInput"
                    />

                    {quickStartCreateForm.status === 'error' && (
                      <EuiFormErrorText>{quickStartCreateForm.error}</EuiFormErrorText>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="m" />

                <EuiButton
                  isLoading={quickStartCreateForm.status === 'loading'}
                  onClick={() => quickStartCreateForm.submit(fleetServerHost)}
                  data-test-subj="generateFleetServerPolicyButton"
                >
                  <FormattedMessage
                    id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicyButton"
                    defaultMessage="Generate Fleet Server policy"
                  />
                </EuiButton>
              </EuiForm>
            </>
          ),
      },
      {
        title: i18n.translate('xpack.fleet.fleetServerFlyout.installFleetServerTitle', {
          defaultMessage: 'Install Fleet Server to a centralized host',
        }),
        status: quickStartCreateForm.status === 'success' ? 'current' : 'disabled',
        children:
          quickStartCreateForm.status === 'success' ? (
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.fleetServerFlyout.installFleetServerInstructions"
                  defaultMessage="Install fleet Server agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. "
                />
              </EuiText>

              <EuiSpacer size="l" />

              <PlatformSelector
                macOsCommand={commands.macos}
                linuxCommand={commands.linux}
                windowsCommand={commands.windows}
                debCommand={commands.deb}
                rpmCommand={commands.rpm}
                isK8s={false}
              />
            </>
          ) : null,
      },
      {
        title: i18n.translate('xpack.fleet.fleetServerFlyout.confirmConnectionTitle', {
          defaultMessage: 'Confirm connection',
        }),
        status: 'disabled',
        children: <>Step 3!</>,
      },
    ];
  }, [commands, fleetServerHost, getHref, quickStartCreateForm]);

  return <EuiSteps steps={steps} />;
};
