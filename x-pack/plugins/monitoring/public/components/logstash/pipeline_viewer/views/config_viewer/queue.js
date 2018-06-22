/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementListHeading } from './statement_list_heading';
import { EuiSpacer, EuiText } from '@elastic/eui';

export function Queue() {
  return (
    <div className="configStatementList">
      <StatementListHeading
        iconType="logstashQueue"
        title="Queue"
      />
      <EuiSpacer size="s" />
      <EuiText className="configViewer__queueMessage">
        Queue metrics not available
      </EuiText>
    </div>
  );
}
