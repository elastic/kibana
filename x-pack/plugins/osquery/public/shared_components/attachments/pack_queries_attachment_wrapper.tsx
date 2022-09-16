/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { getAddToTimeline } from '../../timelines/get_add_to_timeline';
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
  const {
    services: { timelines, appName },
  } = useKibana();
  const [isLive, setIsLive] = useState(false);
  const addToTimelineButton = getAddToTimeline(timelines, appName);

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
      if (!actionId || !addToTimelineButton) {
        return <></>;
      }

      return addToTimelineButton(payload);
    },
    [actionId, addToTimelineButton]
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
