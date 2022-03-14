/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { Filter } from '@kbn/es-query';
import { TimelineId } from '../../../../common/types/timeline';
import { SessionsView } from '../../../common/components/sessions_viewer';
import { AlertsComponentQueryProps } from './types';

const filterHostData: Filter[] = [
  {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'host.name',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "host.name"}}],"minimum_should_match": 1}}]}}}',
    },
  },
];
export const SessionsTabBody = React.memo((alertsProps: AlertsComponentQueryProps) => {
  const { pageFilters, ...rest } = alertsProps;
  const hostPageFilters = useMemo(
    () => (pageFilters != null ? [...filterHostData, ...pageFilters] : filterHostData),
    [pageFilters]
  );

  return (
    <SessionsView
      entityType="sessions"
      timelineId={TimelineId.hostsPageSessions}
      {...rest}
      pageFilters={hostPageFilters}
    />
  );
});

SessionsTabBody.displayName = 'SessionsTabBody';
