/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { useAddToTimeline } from '../../timelines/useAddToTimeline';

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

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const addToTimeline = useCallback(
    (payload) => {
      if (actionId) {
        return handleAddToTimeline(payload);
      }

      return <></>;
    },
    [handleAddToTimeline, actionId]
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
