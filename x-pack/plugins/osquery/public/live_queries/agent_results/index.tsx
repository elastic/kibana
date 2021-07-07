/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useActionDetails } from '../../actions/use_action_details';
import { ResultsTable } from '../../results/results_table';

const QueryAgentResultsComponent = () => {
  const { actionId, agentId } = useParams<{ actionId: string; agentId: string }>();
  const { data } = useActionDetails({ actionId });

  return (
    <>
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {data?.actionDetails._source?.data?.query}
      </EuiCodeBlock>
      <EuiSpacer />
      <ResultsTable actionId={actionId} selectedAgent={agentId} />
    </>
  );
};

export const QueryAgentResults = React.memo(QueryAgentResultsComponent);
