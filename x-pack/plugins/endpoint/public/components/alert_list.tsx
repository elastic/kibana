/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';
import { AppMountContext, AppMountParameters } from 'kibana/public';

export const AlertList = ({ context }: { context: AppMountContext }) => {
  const [data, setData] = useState({ hits: [] });

  async function fetchAlertListData() {
    const response = await context.core.http.get('/alerts', {
      query: {},
    });
    setData({ hits: response.elasticsearchResponse.hits.hits });
  }

  useEffect(() => {
    fetchAlertListData();
  }, []);

  return (
    <EuiPageBody data-test-subj="fooAppPageA">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Alerts</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Alert timestamps</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <ul>
            {data.hits.map(function(alertData: any, index: number) {
              return <li key={index}>{alertData._source.endgame.timestamp_utc}</li>;
            })}
          </ul>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
