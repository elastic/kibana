/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiPage,
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { BASE_PATH } from '../../../common/constants';
import { SessionLeaderTable } from '../SessionLeaderTable';

export const SessionLeaderTablePage = (props: RouteComponentProps) => {
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: 'Session Leader Table',
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change('Session Leader Table');

  return (
    <EuiPage>
      <EuiPageContent data-test-subj="sessionViewTestPage">
        <EuiPageHeader
          pageTitle="Plugin POC"
          iconType="logoKibana"
          description={`Below is a POC of a Kibana plugin, demonstrating data fetching patterns and data rendering.
            Please start by adding some mock data
          `}
        />
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <SessionLeaderTable />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPage>
  );
};
