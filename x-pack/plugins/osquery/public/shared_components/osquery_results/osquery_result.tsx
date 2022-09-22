/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

import { AddToCaseWrapper } from '../../cases/add_to_cases';
import type { OsqueryActionResultsProps } from './types';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { ATTACHED_QUERY } from '../../agents/translations';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';

interface OsqueryResultProps extends Omit<OsqueryActionResultsProps, 'alertId'> {
  actionId: string;
  queryId: string;
  startDate: string;
}

export const OsqueryResult = ({
  actionId,
  ruleName,
  addToTimeline,
  agentIds,
  startDate,
}: OsqueryResultProps) => {
  const { data } = useLiveQueryDetails({
    actionId,
  });

  const addToCaseButton = useCallback(
    (payload) => (
      <AddToCaseWrapper
        queryId={payload.queryId}
        actionId={actionId}
        agentIds={data?.agents}
        isIcon={payload.isIcon}
        isDisabled={payload.isDisabled}
        iconProps={payload.iconProps}
      />
    ),
    [data?.agents, actionId]
  );

  return (
    <div>
      <EuiSpacer size="s" />
      <EuiComment
        username={ruleName && ruleName[0]}
        timestamp={<FormattedRelative value={startDate} />}
        event={ATTACHED_QUERY}
        data-test-subj={'osquery-results-comment'}
      >
        <PackQueriesStatusTable
          actionId={actionId}
          // queryId={queryId}
          data={data?.queries}
          startDate={data?.['@timestamp']}
          expirationDate={data?.expiration}
          agentIds={agentIds}
          addToTimeline={addToTimeline}
          addToCase={addToCaseButton}
        />
      </EuiComment>
      <EuiSpacer size="s" />
    </div>
  );
};
