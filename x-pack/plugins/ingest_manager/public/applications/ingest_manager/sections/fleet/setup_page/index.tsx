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
import { sendRequest, useCore } from '../../../hooks';
import { fleetSetupRouteService } from '../../../services';
import { WithoutHeaderLayout } from '../../../layouts';

export const SetupPage: React.FunctionComponent<{
  refresh: () => Promise<void>;
}> = ({ refresh }) => {
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const core = useCore();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsFormLoading(true);
    try {
      await sendRequest({
        method: 'post',
        path: fleetSetupRouteService.postFleetSetupPath(),
      });
      await refresh();
    } catch (error) {
      core.notifications.toasts.addDanger(error.message);
      setIsFormLoading(false);
    }
  };

  return (
    <WithoutHeaderLayout>
      <EuiPageBody restrictWidth={528}>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="eui-textCenter"
          paddingSize="l"
        >
          <EuiSpacer size="m" />
          <EuiIcon type="lock" color="subdued" size="xl" />
          <EuiSpacer size="m" />
          <EuiTitle size="l">
            <h2>
              <FormattedMessage
                id="xpack.ingestManager.setupPage.title"
                defaultMessage="Enable Fleet"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xl" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.ingestManager.setupPage.description"
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
        </EuiPageContent>
      </EuiPageBody>
    </WithoutHeaderLayout>
  );
};
