/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiForm,
  EuiText,
  EuiButton,
  EuiTitle,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';
import { useCore, sendPostFleetSetup } from '../../../hooks';
import { WithoutHeaderLayout } from '../../../layouts';
import { GetFleetStatusResponse } from '../../../types';

export const SetupPage: React.FunctionComponent<{
  refresh: () => Promise<void>;
  missingRequirements: GetFleetStatusResponse['missing_requirements'];
}> = ({ refresh, missingRequirements }) => {
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const core = useCore();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsFormLoading(true);
    try {
      await sendPostFleetSetup({ forceRecreate: true });
      await refresh();
    } catch (error) {
      core.notifications.toasts.addDanger(error.message);
      setIsFormLoading(false);
    }
  };

  const content =
    missingRequirements.includes('tls_required') ||
    missingRequirements.includes('api_keys') ||
    missingRequirements.includes('encrypted_saved_object_encryption_key_required') ? (
      <>
        <EuiSpacer size="m" />
        <EuiIcon type="lock" color="subdued" size="xl" />
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h2>
            <FormattedMessage
              id="xpack.ingestManager.setupPage.missingRequirementsTitle"
              defaultMessage="Missing requirements"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xl" />
        <EuiText color="subdued" textAlign={'left'}>
          <FormattedMessage
            id="xpack.ingestManager.setupPage.missingRequirementsDescription"
            defaultMessage="To use Fleet, you must enable the following features:
          {space}- Enable Elasticsearch API keys.
          {space}- Enable TLS to secure the communication between Agents and Kibana.
          {space}- Set the encryption key for encrypted saved objects.
          "
            values={{
              space: <EuiSpacer size="m" />,
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
      </>
    ) : (
      <>
        <EuiSpacer size="m" />
        <EuiIcon type="lock" color="subdued" size="xl" />
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h2>
            <FormattedMessage
              id="xpack.ingestManager.setupPage.enableTitle"
              defaultMessage="Enable Fleet"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xl" />
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.ingestManager.setupPage.enableText"
            defaultMessage="In order to use Fleet, you must create an Elastic user. This user can create API keys
        and write to logs-* and metrics-*."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiForm>
          <form onSubmit={onSubmit}>
            <EuiButton fill isLoading={isFormLoading} type="submit">
              <FormattedMessage
                id="xpack.ingestManager.setupPage.enableFleet"
                defaultMessage="Create user and enable Fleet"
              />
            </EuiButton>
          </form>
        </EuiForm>
        <EuiSpacer size="m" />
      </>
    );

  return (
    <WithoutHeaderLayout>
      <EuiPageBody restrictWidth={548}>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="eui-textCenter"
          paddingSize="l"
        >
          {content}
        </EuiPageContent>
      </EuiPageBody>
    </WithoutHeaderLayout>
  );
};
