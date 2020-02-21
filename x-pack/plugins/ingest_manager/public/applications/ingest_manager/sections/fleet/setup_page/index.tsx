/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiText,
  EuiButton,
  EuiCallOut,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { sendRequest, useInput, useCore } from '../../../hooks';
import { fleetSetupRouteService } from '../../../services';

export const SetupPage: React.FunctionComponent<{
  refresh: () => Promise<void>;
}> = ({ refresh }) => {
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const core = useCore();
  const usernameInput = useInput();
  const passwordInput = useInput();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsFormLoading(true);
    try {
      await sendRequest({
        method: 'post',
        path: fleetSetupRouteService.postFleetSetupPath(),
        body: JSON.stringify({
          admin_username: usernameInput.value,
          admin_password: passwordInput.value,
        }),
      });
      await refresh();
    } catch (error) {
      core.notifications.toasts.addDanger(error.message);
      setIsFormLoading(false);
    }
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle>
          <h1>Setup</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiCallOut title="Warning!" color="warning" iconType="help">
          <EuiText>
            To setup fleet and ingest you need to a enable a user that can create API Keys and write
            to logs-* and metrics-*
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <EuiForm>
          <form onSubmit={onSubmit}>
            <EuiFormRow label="Username">
              <EuiFieldText name="username" {...usernameInput.props} />
            </EuiFormRow>
            <EuiFormRow label="Password">
              <EuiFieldPassword name="password" {...passwordInput.props} />
            </EuiFormRow>
            <EuiButton isLoading={isFormLoading} type="submit">
              Submit
            </EuiButton>
          </form>
        </EuiForm>
      </EuiPageContent>
    </EuiPageBody>
  );
};
