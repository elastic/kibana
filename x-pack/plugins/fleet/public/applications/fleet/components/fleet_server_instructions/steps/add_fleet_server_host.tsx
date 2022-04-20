/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormErrorText,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices, useLink } from '../../../hooks';
import type { FleetServerHostForm } from '../hooks';
import { FleetServerHostComboBox } from '../components';

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
    fleetServerHost,
    fleetServerHostSettings,
    setFleetServerHost,
    validateFleetServerHost,
    saveFleetServerHost,
    error,
  } = fleetServerHostForm;

  const [isLoading, setIsLoading] = useState(false);
  const [submittedFleetServerHost, setSubmittedFleetServerHost] = useState<string>();
  const { notifications } = useStartServices();
  const { getHref } = useLink();

  const onSubmit = useCallback(async () => {
    try {
      setSubmittedFleetServerHost('');
      setIsLoading(true);

      if (validateFleetServerHost()) {
        await saveFleetServerHost();
        setSubmittedFleetServerHost(fleetServerHost);
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
  }, [validateFleetServerHost, saveFleetServerHost, fleetServerHost, notifications.toasts]);

  const onChange = useCallback(
    (host: string) => {
      setFleetServerHost(host);

      if (error) {
        validateFleetServerHost();
      }
    },
    [error, setFleetServerHost, validateFleetServerHost]
  );

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
      <EuiFlexGroup>
        <EuiFlexItem>
          <FleetServerHostComboBox
            fleetServerHost={fleetServerHost}
            fleetServerHostSettings={fleetServerHostSettings}
            isDisabled={isLoading}
            isInvalid={!!error}
            onFleetServerHostChange={onChange}
          />
          {error && <EuiFormErrorText>{error}</EuiFormErrorText>}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
      </EuiFlexGroup>
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
                host: submittedFleetServerHost,
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
