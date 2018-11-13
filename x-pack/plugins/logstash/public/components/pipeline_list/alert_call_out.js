/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { PIPELINE_LIST } from './constants';

export function AlertCallOut(props) {
  return (
    <EuiCallOut title={PIPELINE_LIST.INFO_ALERTS.CALL_OUT_TITLE} color="warning" iconType="help">
      <p>How can I see additional pipelines?</p>
      {props.children}
    </EuiCallOut>
  );
}
