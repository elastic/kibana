/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Filter } from '@kbn/es-query';
import { Subject } from 'rxjs';
import { SLOView } from '../../../pages/slos/components/toggle_slo_view';
import { SloEmbeddableInput } from './types';
import { GroupView } from '../../../pages/slos/components/grouped_slos/group_view';

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
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [kqlQuery, setKqlQuery] = useState(initialKqlQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [groups, setGroups] = useState(initialGroups);

  let groupsKqlQuery = '';
  groups.map((group, index) => {
    const shouldAddOr = index < groups.length - 1;
    groupsKqlQuery += `(${groupBy}:"${group}")`;
    if (shouldAddOr) {
      groupsKqlQuery += ' or ';
    }
  });

  let combinedKqlQuery = '';
  if (kqlQuery && groupsKqlQuery) {
    combinedKqlQuery = `${groupsKqlQuery} and ${kqlQuery}`;
  } else if (groupsKqlQuery) {
    combinedKqlQuery = groupsKqlQuery;
  } else if (kqlQuery) {
    combinedKqlQuery = kqlQuery;
  }

  useEffect(() => {
    const subs = reloadGroupSubject?.subscribe((input) => {
      if (input) {
        const ngroupBy = input?.groupFilters?.groupBy ?? groupBy;
        setGroupBy(ngroupBy);

        const nKqlInput = input?.groupFilters?.kqlQuery ?? kqlQuery;
        setKqlQuery(nKqlInput);

        const nFilters = input?.groupFilters?.filters ?? filters;
        setFilters(nFilters);

        const nGroups = input?.groupFilters?.groups ?? groups;
        setGroups(nGroups);
      }
    });
    return () => {
      subs?.unsubscribe();
    };
  }, [filters, groupBy, groups, kqlQuery, reloadGroupSubject]);

  return (
    <GroupView sloView={sloView} groupBy={groupBy} kqlQuery={combinedKqlQuery} filters={filters} />
  );
}
