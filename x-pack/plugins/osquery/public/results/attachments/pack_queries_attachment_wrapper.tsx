/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../../common/lib/kibana';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

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

  const { data } = useLiveQueryDetails({
    actionId,
    isLive,
    ...(queryId ? { queryIds: [queryId] } : {}),
  });

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const {
    services: { timelines },
  } = useKibana();

  const { getAddToTimelineButton } = timelines.getHoverActions();

  const handleAddToTimeline = useCallback(
    (payload: { query: [string, string]; isIcon?: true }) => {
      const {
        query: [field, value],
        isIcon,
      } = payload;
      const providerA = {
        and: [],
        enabled: true,
        excluded: false,
        id: value,
        kqlQuery: '',
        name: value,
        queryMatch: {
          field,
          value,
          operator: ':' as const,
        },
      };

      return getAddToTimelineButton({
        dataProvider: providerA,
        field: value,
        ownFocus: false,
        ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
      });
    },
    [getAddToTimelineButton]
  );

  const addToTimeline = useCallback(() => {
    if (actionId) {
      return handleAddToTimeline({
        query: ['action_id', actionId],
      });
    }

    return <></>;
  }, [handleAddToTimeline, actionId]);

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
