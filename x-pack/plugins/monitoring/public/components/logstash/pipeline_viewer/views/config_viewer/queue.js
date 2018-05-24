/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementListHeading } from './statement_list_heading';

export function Queue() {
  return (
    <div className="cv-statementList">
      <StatementListHeading
        iconType="logstashQueue"
        title="Queue"
      />
      <div className="cv-queue__messageText">
        Queue stats not available
      </div>
    </div>
  );
}
