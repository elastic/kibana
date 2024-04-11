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
import { SloEmbeddableInput } from '../types';
import { GroupView } from '../../../../pages/slos/components/grouped_slos/group_view';
import { buildCombinedKqlQuery } from './helpers/build_kql_query';

interface Props {
  groupBy: string;
  groups?: string[];
  kqlQuery?: string;
  sloView: SLOView;
  sort?: string;
  filters?: Filter[];
  reloadGroupSubject: Subject<SloEmbeddableInput | undefined>;
}

export function GroupSloView({
  sloView,
  groupBy: initialGroupBy = 'status',
  groups: initialGroups = [],
  kqlQuery: initialKqlQuery = '',
  filters: initialFilters = [],
  reloadGroupSubject,
}: Props) {
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [kqlQuery, setKqlQuery] = useState(initialKqlQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [groups, setGroups] = useState(initialGroups);

  const combinedKqlQuery = buildCombinedKqlQuery({ groups, groupBy, kqlQuery });

  useEffect(() => {
    const subs = reloadGroupSubject?.subscribe((input) => {
      if (input) {
        const nGroupBy = input?.groupFilters?.groupBy ?? groupBy;
        setGroupBy(nGroupBy);

        const nKqlInput = input?.groupFilters?.kqlQuery ?? kqlQuery;
        setKqlQuery(nKqlInput);

        const nFilters = input?.groupFilters?.filters ?? filters;
        setFilters(nFilters);

        const nGroups = input?.groupFilters?.groups ?? groups;
        setGroups(nGroups);
      }
      setLastRefreshTime(Date.now());
    });
    return () => {
      subs?.unsubscribe();
    };
  }, [filters, groupBy, groups, kqlQuery, reloadGroupSubject]);

  return (
    <GroupView
      sloView={sloView}
      groupBy={groupBy}
      kqlQuery={combinedKqlQuery}
      filters={filters}
      lastRefreshTime={lastRefreshTime}
    />
  );
}
