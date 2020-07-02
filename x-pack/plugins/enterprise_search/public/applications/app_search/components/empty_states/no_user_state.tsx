/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { EngineOverviewHeader } from '../engine_overview_header';
import { getUserName } from '../../utils/get_username';

import './empty_states.scss';

export const NoUserState: React.FC<> = () => {
  const username = getUserName();

  return (
    <EuiPage restrictWidth className="empty-state">
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="no_as_account" />

      <EuiPageBody>
        <EngineOverviewHeader />
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="lock"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.noUserState.title"
                  defaultMessage="Cannot find App Search account"
                />
              </h2>
            }
            titleSize="l"
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.noUserState.description1"
                    defaultMessage="We cannot find an App Search account matching your username{username}."
                    values={{
                      username: username ? <EuiCode>{username}</EuiCode> : '',
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.noUserState.description2"
                    defaultMessage="Please contact your App Search administrator to request an invite for that user."
                  />
                </p>
              </>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
