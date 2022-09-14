/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAddToTimeline } from '../../timelines/use_add_to_timeline';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';

interface PackQueriesAttachmentWrapperProps {
  actionId?: string;
  agentIds: string[];
  queryId: string;
}

export const PackQueriesAttachmentWrapper = ({
  actionId,
  agentIds,
  queryId,
}: PackQueriesAttachmentWrapperProps) => {
  const [isLive, setIsLive] = useState(false);
  const handleAddToTimeline = useAddToTimeline();

  const { data } = useLiveQueryDetails({
    actionId,
    isLive,
    ...(queryId ? { queryIds: [queryId] } : {}),
  });

  // TODO think of a better way to distinguish if we want to put timeline in here, so far I have no other ideas
  const { basePath } = useHistory() as unknown as { basePath: string };
  const isObservability = basePath === '/app/observability';

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const addToTimeline = useCallback(
    (payload) => {
      if (!actionId || isObservability) {
        return <></>;
      }

      return handleAddToTimeline(payload);
    },
    [actionId, isObservability, handleAddToTimeline]
  );

  return (
    <PackQueriesStatusTable
      actionId={actionId}
      queryId={queryId}
      data={data?.queries}
      startDate={data?.['@timestamp']}
      expirationDate={data?.expiration}
      agentIds={agentIds}
      addToTimeline={addToTimeline}
    />
  );
};
