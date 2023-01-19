/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiForm,
  EuiFormErrorText,
  EuiButtonEmpty,
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
import { FleetServerHostSelect } from '../components';

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
  onClose,
}) => {
  const { getHref } = useLink();

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
                // eslint-disable-next-line @elastic/eui/href-or-on-click
                <EuiButtonEmpty href={getHref('settings')} onClick={onClose} flush="left">
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.fleetSettingsLink"
                    defaultMessage="Fleet Settings"
                  />
                </EuiButtonEmpty>
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
      {selectedFleetServerHost ? (
        <FleetServerHostSelect
          setFleetServerHost={setFleetServerHost}
          selectedFleetServerHost={selectedFleetServerHost}
          fleetServerHosts={fleetServerHosts}
        />
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
            {fleetServerHosts.length > 0 ? (
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
            ) : null}
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiButton
          isLoading={status === 'loading'}
          onClick={submit}
          data-test-subj="generateFleetServerPolicyButton"
        >
          {fleetServerHosts.length > 0 ? (
            <FormattedMessage
              id="xpack.fleet.fleetServerFlyout.continueFleetServerPolicyButton"
              defaultMessage="Continue"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.fleetServerFlyout.generateFleetServerPolicyButton"
              defaultMessage="Generate Fleet Server policy"
            />
          )}
        </EuiButton>
      </EuiForm>
    </>
  );
};
