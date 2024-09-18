/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import { Subject } from 'rxjs';
import { GroupView } from '../../../../pages/slos/components/grouped_slos/group_view';
import { GroupByField } from '../../../../pages/slos/components/slo_list_group_by';
import { SLOView } from '../../../../pages/slos/components/toggle_slo_view';
import { SortField } from '../../../../pages/slos/hooks/use_url_search_state';
import { buildCombinedKqlQuery } from './helpers/build_kql_query';

interface Props {
  groupBy: GroupByField;
  groups?: string[];
  kqlQuery?: string;
  view: SLOView;
  sort?: SortField;
  filters?: Filter[];
  reloadSubject: Subject<boolean>;
}

export function GroupSloView({
  view,
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
      view={view}
      groupBy={groupBy}
      groupsFilter={groups}
      kqlQuery={combinedKqlQuery}
      filters={filters}
      lastRefreshTime={lastRefreshTime}
    />
  );
}
