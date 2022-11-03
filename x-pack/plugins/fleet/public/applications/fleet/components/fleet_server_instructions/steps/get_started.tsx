/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiSelect, EuiButtonEmpty } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiForm,
  EuiFormErrorText,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { MultiRowInput } from '../../../sections/settings/components/multi_row_input';

import { useLink } from '../../../hooks';

import type { QuickStartCreateForm } from '../hooks';

export function getGettingStartedStep(props: QuickStartCreateForm): EuiStepProps {
  return {
    title: i18n.translate('xpack.fleet.fleetServerFlyout.getStartedTitle', {
      defaultMessage: 'Get started with Fleet Server',
    }),
    status: props.status === 'success' ? 'complete' : 'current',
    children: <GettingStartedStepContent {...props} />,
  };
}

const GettingStartedStepContent: React.FunctionComponent<QuickStartCreateForm> = ({
  fleetServerHosts,
  fleetServerHost: selectedFleetServerHost,
  setFleetServerHost,
  status,
  error,
  inputs,
  submit,
}) => {
  const { getHref } = useLink();

  const fleetServerHostsOptions = useMemo(
    () =>
      fleetServerHosts.map((fleetServerHost) => {
        return {
          text: fleetServerHost.name,
          value: fleetServerHost.id,
        };
      }),
    [fleetServerHosts]
  );

  if (status === 'success') {
    return (
      <EuiCallOut
        color="success"
        iconType="check"
        title={i18n.translate(
          'xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessTitle',
          {
            defaultMessage: 'Fleet Server policy created.',
          }
        )}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicySuccessInstructions"
            defaultMessage="Fleet server policy and service token have been generated. Host configured at {hostUrl}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
            values={{
              hostUrl: <EuiCode>{selectedFleetServerHost?.host_urls[0]}</EuiCode>,
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
    );
  }

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.getStartedInstructions"
          defaultMessage="First, set the public IP or host name and port that agents will use to reach Fleet Server. It uses port {port} by default. We'll then generate a policy for you automatically."
          values={{ port: <EuiCode>8220</EuiCode> }}
        />
      </EuiText>

      <EuiSpacer size="m" />
      {fleetServerHosts.length > 0 ? (
        <>
          <EuiSelect
            fullWidth
            prepend={
              <EuiText size="relative" color={''}>
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.fleetServerHostsLabel"
                  defaultMessage="Fleet Server Hosts"
                />
              </EuiText>
            }
            append={
              <EuiButtonEmpty
                data-test-subj="fleetServerSetup.addNewHostBtn"
                onClick={() => setFleetServerHost(null)}
              >
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.fleetServerHostsLabel"
                  defaultMessage="Add new Fleet Server Hosts"
                />
              </EuiButtonEmpty>
            }
            onChange={(e) =>
              setFleetServerHost(
                fleetServerHosts.find((fleetServerHost) => fleetServerHost.id === e.target.value)
              )
            }
            options={fleetServerHostsOptions}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <EuiForm onSubmit={submit}>
        {!selectedFleetServerHost ? (
          <>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.nameInputLabel"
                  defaultMessage="Name"
                />
              }
              {...inputs.nameInput.formRowProps}
            >
              <EuiFieldText
                data-test-subj="fleetServerSetup.nameInput"
                fullWidth
                placeholder={i18n.translate('xpack.fleet.fleetServerSetup.nameInputPlaceholder', {
                  defaultMessage: 'Specify name',
                })}
                {...inputs.nameInput.props}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.hostUrlLabel"
                  defaultMessage="URL"
                />
              }
            >
              <>
                <MultiRowInput
                  data-test-subj="fleetServerSetup.multiRowInput"
                  {...inputs.hostUrlsInput.props}
                  placeholder={i18n.translate(
                    'xpack.fleet.fleetServerSetup.fleetServerHostsInputPlaceholder',
                    {
                      defaultMessage: 'Specify host URL',
                    }
                  )}
                />
                {status === 'error' && <EuiFormErrorText>{error}</EuiFormErrorText>}
              </>
            </EuiFormRow>
            <EuiFormRow fullWidth {...inputs.isDefaultInput.formRowProps}>
              <EuiSwitch
                data-test-subj="fleetServerHostsFlyout.isDefaultSwitch"
                {...inputs.isDefaultInput.props}
                disabled={false}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.fleetServerHostsFlyout.defaultOutputSwitchLabel"
                    defaultMessage="Make this Fleet server the default one."
                  />
                }
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiButton
          isLoading={status === 'loading'}
          onClick={submit}
          data-test-subj="generateFleetServerPolicyButton"
        >
          <FormattedMessage
            id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicyButton"
            defaultMessage="Generate Fleet Server policy"
          />
        </EuiButton>
      </EuiForm>
    </>
  );
};
