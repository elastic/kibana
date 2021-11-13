/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiPageContent, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { BASE_PATH } from '../../../common/constants';

import { SessionView } from '../SessionView';

// TODO: sourced from local test data. eventually, session list table will pass in process.entry.entity_id
const testRootEntityId = '44f4dece-d963-51c9-bfa3-875c0c8e1ec3';

export const SessionViewPage = (props: RouteComponentProps) => {
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: 'Process Tree',
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change('Process Tree');

  return (
    <EuiPage>
      <EuiPageContent>
        <EuiPageHeader
          pageTitle="Process Tree"
          iconType="logoKibana"
          description={`Below is an example of the process tree, demonstrating data fetching patterns and data rendering.
            Please start by adding some mock data
            `}
        />
        <EuiSpacer />
        <SessionView sessionEntityId={testRootEntityId} />
        <EuiSpacer />
      </EuiPageContent>
    </EuiPage>
  );
};
