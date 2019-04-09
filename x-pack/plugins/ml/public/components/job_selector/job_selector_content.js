/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';


export function JobSelectorContent({
  singleSelection,
  timeseriesOnly // eslint-disable-line
}) {
  const tabs = [{
    id: 'Jobs',
    name: 'Jobs',
    content: renderJobsTable(),
  },
  {
    id: 'Groups',
    name: 'Groups',
    content: (
      <Fragment>
        <EuiText>
          GROUPS STUFF.
        </EuiText>
      </Fragment>
    ),
  }];

  function renderJobsTable() {
    return (
      <Fragment>
        <EuiText>
          JOBS TABLE.
        </EuiText>
      </Fragment>
    );
  }

  function renderTabs() {
    return (
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        onTabClick={(tab) => { console.log('clicked tab', tab); }}
      />
    );
  }

  return (
    <Fragment>
      {singleSelection === 'true' && renderJobsTable()}
      {singleSelection === undefined && renderTabs()}
    </Fragment>
  );
}

JobSelectorContent.propTypes = {
  singleSelection: PropTypes.string,
  timeseriesOnly: PropTypes.string
};
