/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { usePackQueryLastResults } from '../packs/use_pack_query_last_results';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { ViewResultsInLensAction } from './view_results_in_lens';

interface PackViewInActionProps {
  item: {
    id: string;
    interval: number;
    action_id?: string;
    agents: string[];
  };
  actionId?: string;
}
const PackViewInLensActionComponent: React.FC<PackViewInActionProps> = ({ item }) => {
  const { action_id: actionId, interval } = item;
  const { data: lastResultsData } = usePackQueryLastResults({
    actionId,
    interval,
  });

  const startDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).subtract(interval, 'seconds').toISOString()
    : `now-${interval}s`;
  const endDate = lastResultsData?.['@timestamp']
    ? moment(lastResultsData?.['@timestamp'][0]).toISOString()
    : 'now';

  return (
    <ViewResultsInLensAction
      actionId={actionId}
      buttonType={ViewResultsActionButtonType.icon}
      startDate={startDate}
      endDate={endDate}
      mode={lastResultsData?.['@timestamp'][0] ? 'absolute' : 'relative'}
    />
  );
};

export const PackViewInLensAction = React.memo(PackViewInLensActionComponent);
