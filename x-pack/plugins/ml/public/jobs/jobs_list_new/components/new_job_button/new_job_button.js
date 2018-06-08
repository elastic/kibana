/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import './styles/main.less';

import {
  EuiButton,
} from '@elastic/eui';

function newJob() {
  window.location.href = `#/jobs/new_job`;
}

export function NewJobButton() {
  return (
    <EuiButton
      onClick={newJob}
      size="s"
      fill
    >
      <i className="new-job-button fa fa-plus" />
      Create New Job
    </EuiButton>
  );
}
