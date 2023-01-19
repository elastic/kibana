/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import {
  EuiSwitch,
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetServerHost } from '../../../types';

import { useStartServices, useLink } from '../../../hooks';
import type { FleetServerHostForm } from '../hooks';
import { MultiRowInput } from '../../../sections/settings/components/multi_row_input';
import { FleetServerHostSelect } from '../components';

export const getAddFleetServerHostStep = ({
  fleetServerHostForm,
  disabled,
  onClose,
}: {
  fleetServerHostForm: FleetServerHostForm;
  disabled: boolean;
  onClose: () => void;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostStepTitle', {
      defaultMessage: 'Add your Fleet Server host',
    }),
    status: disabled ? 'disabled' : undefined,
    children: disabled ? null : (
      <AddFleetServerHostStepContent fleetServerHostForm={fleetServerHostForm} onClose={onClose} />
    ),
  };
};

export const AddFleetServerHostStepContent = ({
  fleetServerHostForm,
  onClose,
}: {
  fleetServerHostForm: FleetServerHostForm;
  onClose: () => void;
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

      if (validate()) {
        setFleetServerHost(await saveFleetServerHost(newFleetServerHost));
        setSubmittedFleetServerHost(newFleetServerHost);
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
      {selectedFleetServerHost ? (
        <FleetServerHostSelect
          setFleetServerHost={setFleetServerHost}
          selectedFleetServerHost={selectedFleetServerHost}
          fleetServerHosts={fleetServerHosts}
        />
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
          </EuiCallOut>
        </>
      )}
    </EuiForm>
  );
};
