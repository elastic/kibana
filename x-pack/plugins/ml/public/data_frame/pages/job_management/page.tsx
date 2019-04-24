/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { DataFrameJobList } from './components/job_list';

function newJob() {
  window.location.href = `#/data_frame/new_job`;
}

export const Page: SFC = () => (
  <EuiPage>
    <EuiPageBody>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.ml.dataframe.jobsList.dataFrameTitle"
                defaultMessage="Data frame jobs"
              />
            </h1>
          </EuiTitle>
        </EuiPageContentHeaderSection>
        <EuiPageContentHeaderSection>
          <EuiButton fill onClick={newJob} iconType="plusInCircle" size="s">
            <FormattedMessage
              id="xpack.ml.dataframe.jobsList.createDataFrameButton"
              defaultMessage="Create data frame"
            />
          </EuiButton>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiSpacer size="l" />
        <EuiPanel>
          <DataFrameJobList />
        </EuiPanel>
      </EuiPageContentBody>
    </EuiPageBody>
  </EuiPage>
);
