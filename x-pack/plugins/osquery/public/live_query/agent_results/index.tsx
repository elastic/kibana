/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useActionDetails } from '../../actions/use_action_details';
import { ResultsTable } from '../../results/results_table';

const QueryAgentResultsComponent = () => {
  const { actionId, agentId } = useParams<{ actionId: string; agentId: string }>();
  const [, { actionDetails }] = useActionDetails({ actionId });

  return (
    <>
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {
          // @ts-expect-error
          actionDetails._source?.data.commands[0].query
        }
      </EuiCodeBlock>
      <EuiSpacer />
      <ResultsTable actionId={actionId} agentId={agentId} />
    </>
  );
};

export const QueryAgentResults = React.memo(QueryAgentResultsComponent);
