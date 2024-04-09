/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { Subject } from 'rxjs';
import { SLOView } from '../../../pages/slos/components/toggle_slo_view';
import { SloEmbeddableInput } from './types';
import { GroupView } from '../../../pages/slos/components/grouped_slos/group_view';
import { groupByOptions } from './slo_group_filters';

interface Props {
  groupBy: string;
  kqlQuery?: string;
  sloView: SLOView;
  sort?: string;
  filters?: Filter[];
  reloadGroupSubject: Subject<SloEmbeddableInput | undefined>;
  setTitle: (title: string) => void;
}

export function GroupSloView({
  sloView,
  groupBy: initialGroupBy = 'status',
  kqlQuery: initialKqlQuery = '',
  filters: initialFilters = [],
  reloadGroupSubject,
  setTitle,
}: Props) {
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [kqlQuery, setKqlQuery] = useState(initialKqlQuery);
  const [filters, setFilters] = useState(initialFilters);
  useEffect(() => {
    const subs = reloadGroupSubject?.subscribe((input) => {
      if (input) {
        const ngroupBy = input?.groupFilters?.groupBy ?? groupBy;
        setGroupBy(ngroupBy);

        const nKqlInput = input?.groupFilters?.kqlQuery ?? kqlQuery;
        setKqlQuery(nKqlInput);

        const nFilters = input?.groupFilters?.filters ?? filters;
        setFilters(nFilters);

        let newTitle = '';
        const groupByText = groupByOptions.find((option) => option.value === ngroupBy)?.text;
        if (input.overviewMode === 'single') {
          newTitle = 'SLO Overview';
        } else {
          newTitle = i18n.translate('xpack.slo.sloEmbeddable.groupBy.displayTitle', {
            defaultMessage: 'SLO Overview group by {groupByText}',
            values: { groupByText },
          });
        }
        setTitle(newTitle);
      }
      // setLastRefreshTime(Date.now());
    });
    return () => {
      subs?.unsubscribe();
    };
  }, [filters, groupBy, kqlQuery, reloadGroupSubject, setTitle]);

  return <GroupView sloView={sloView} groupBy={groupBy} kqlQuery={kqlQuery} filters={filters} />;
}
