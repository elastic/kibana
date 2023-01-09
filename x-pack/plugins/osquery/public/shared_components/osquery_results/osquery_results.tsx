/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { OsqueryResult } from './osquery_result';
import type { OsqueryActionResultsWithItems } from './types';

export const OsqueryResults: React.FC<OsqueryActionResultsWithItems> = ({
  agentIds,
  ruleName,
  actionItems,
  ecsData,
}) => (
  <div data-test-subj={'osquery-results'}>
    {actionItems?.map((item, index) => {
      const actionIndex = item.fields?.action_id?.[0];
      const startDate = item.fields?.['@timestamp'][0];

      return (
        <OsqueryResult
          key={actionIndex + index}
          actionId={actionIndex}
          startDate={startDate}
          ruleName={ruleName}
          agentIds={agentIds}
          ecsData={ecsData}
        />
      );
    })}
    <EuiSpacer size="s" />
  </div>
);
