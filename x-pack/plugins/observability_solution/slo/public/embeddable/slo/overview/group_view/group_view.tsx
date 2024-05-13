/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Filter } from '@kbn/es-query';
import { Subject } from 'rxjs';
import { SLOView } from '../../../../pages/slos/components/toggle_slo_view';
import { GroupView } from '../../../../pages/slos/components/grouped_slos/group_view';
import { buildCombinedKqlQuery } from './helpers/build_kql_query';

interface Props {
  groupBy: string;
  groups?: string[];
  kqlQuery?: string;
  sloView: SLOView;
  sort?: string;
  filters?: Filter[];
  reloadSubject: Subject<boolean>;
}

export function GroupSloView({
  sloView,
  groupBy = 'status',
  groups = [],
  kqlQuery = '',
  filters = [],
  reloadSubject,
}: Props) {
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);
  const combinedKqlQuery = buildCombinedKqlQuery({ groups, groupBy, kqlQuery });

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });
    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  return (
    <GroupView
      sloView={sloView}
      groupBy={groupBy}
      groupsFilter={groups}
      kqlQuery={combinedKqlQuery}
      filters={filters}
      lastRefreshTime={lastRefreshTime}
    />
  );
}
