/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { useKibana } from '../common/lib/kibana';

import { PLUGIN_NAME } from '../../common';
import { AgentsTable } from '../agents/agents_table';
import { OsqueryEditor } from '../editor';

export const OsqueryApp = () => {
  const { http, notifications } = useKibana().services;
  // Use React hooks to manage state.
  const [timestamp, setTimestamp] = useState<string | undefined>();

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http.get('/api/osquery/example').then((res) => {
      setTimestamp(res.time);
      // Use the core notifications service to display a success message.
      notifications.toasts.addSuccess(
        i18n.translate('osquery.dataUpdated', {
          defaultMessage: 'Data updated',
        })
      );
    });
  };

  return (
    <EuiPage restrictWidth="1000px">
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="osquery.helloWorldText"
                defaultMessage="{name}"
                values={{ name: PLUGIN_NAME }}
              />
            </h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="osquery.congratulationsTitle"
                  defaultMessage="Congratulations, you have successfully created a new Kibana Plugin!"
                />
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiText>
              <p>
                <FormattedMessage
                  id="osquery.content"
                  defaultMessage="Look through the generated code and check out the plugin development documentation."
                />
              </p>
              <EuiHorizontalRule />
              <p>
                <FormattedMessage
                  id="osquery.timestampText"
                  defaultMessage="Last timestamp: {time}"
                  values={{ time: timestamp ? timestamp : 'Unknown' }}
                />
              </p>
              <EuiButton type="primary" size="s" onClick={onClickHandler}>
                <FormattedMessage id="osquery.buttonText" defaultMessage="Get data" />
              </EuiButton>
            </EuiText>

            <EuiSpacer />
            <OsqueryEditor />

            <EuiSpacer />

            <AgentsTable />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
