/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useState } from 'react';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';

interface PackQueriesAttachmentWrapperProps {
  actionId: string;
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

  return (
    <CasesAttachmentWrapperContext.Provider value={true}>
      <PackQueriesStatusTable
        actionId={actionId}
        queryId={queryId}
        data={data?.queries}
        startDate={data?.['@timestamp']}
        expirationDate={data?.expiration}
        agentIds={agentIds}
      />
    </CasesAttachmentWrapperContext.Provider>
  );
};

export const CasesAttachmentWrapperContext = React.createContext(false);
