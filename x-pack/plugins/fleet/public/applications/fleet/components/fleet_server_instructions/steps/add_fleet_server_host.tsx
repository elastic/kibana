/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';

import type { EuiStepProps } from '@elastic/eui';
import { EuiSelect, EuiSwitch } from '@elastic/eui';
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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetServerHost } from '../../../types';

import { useStartServices, useLink } from '../../../hooks';
import type { FleetServerHostForm } from '../hooks';
import { MultiRowInput } from '../../../sections/settings/components/multi_row_input';

export const getAddFleetServerHostStep = ({
  fleetServerHostForm,
  disabled,
}: {
  fleetServerHostForm: FleetServerHostForm;
  disabled: boolean;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostStepTitle', {
      defaultMessage: 'Add your Fleet Server host',
    }),
    status: disabled ? 'disabled' : undefined,
    children: disabled ? null : (
      <AddFleetServerHostStepContent fleetServerHostForm={fleetServerHostForm} />
    ),
  };
};

export const AddFleetServerHostStepContent = ({
  fleetServerHostForm,
}: {
  fleetServerHostForm: FleetServerHostForm;
}) => {
  const {
    setFleetServerHost,
    fleetServerHost: selectedFleetServerHost,
    saveFleetServerHost,
    fleetServerHosts,
    error,
    validate,
    inputs,
  } = fleetServerHostForm;

  const [isLoading, setIsLoading] = useState(false);
  const [submittedFleetServerHost, setSubmittedFleetServerHost] = useState<FleetServerHost>();
  const { notifications } = useStartServices();
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

  const onSubmit = useCallback(async () => {
    try {
      setSubmittedFleetServerHost(undefined);
      setIsLoading(true);

      const newFleetServerHost = {
        name: inputs.nameInput.value,
        host_urls: inputs.hostUrlsInput.value,
        is_default: true,
        id: 'fleet-server-host',
        is_preconfigured: false,
      };
      setFleetServerHost(newFleetServerHost);
      if (validate()) {
        setSubmittedFleetServerHost(newFleetServerHost);
        setFleetServerHost(await saveFleetServerHost(newFleetServerHost));
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorAddingFleetServerHostTitle', {
          defaultMessage: 'Error adding Fleet Server host',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    inputs.nameInput.value,
    inputs.hostUrlsInput.value,
    setFleetServerHost,
    validate,
    saveFleetServerHost,
    notifications.toasts,
  ]);

  return (
    <EuiForm onSubmit={onSubmit}>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.addFleetServerHostStepDescription"
          defaultMessage="First, set the public IP or host name and port that agents will use to reach Fleet Server. It uses port {port} by default. We'll then generate a policy for you automatically. "
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
                  id="xpack.fleet.fleetServerSetup.addFleetServerHostBtn"
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
              {error && <EuiFormErrorText>{error}</EuiFormErrorText>}
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
          <EuiButton
            isLoading={isLoading}
            onClick={onSubmit}
            data-test-subj="fleetServerAddHostBtn"
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostButton"
              defaultMessage="Add host"
            />
          </EuiButton>
        </>
      ) : null}
      {submittedFleetServerHost && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="check"
            size="s"
            color="success"
            title={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessTitle"
                defaultMessage="Added Fleet Server host"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessText"
              defaultMessage="Added {host}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
              values={{
                host: submittedFleetServerHost.host_urls[0],
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
          </EuiCallOut>
        </>
      )}
    </EuiForm>
  );
};
