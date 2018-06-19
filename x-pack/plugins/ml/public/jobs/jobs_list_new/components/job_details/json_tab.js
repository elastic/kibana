/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiSpacer
} from '@elastic/eui';

import { MLJobEditor } from '../ml_job_editor';

export function JsonPane({ job }) {
  console.log('JsonPane');
  const json = JSON.stringify(job, null, 2);
  return (
    <React.Fragment>
      <EuiSpacer size="s" />
      <MLJobEditor value={json} readOnly={true} />
    </React.Fragment>
  );
}
