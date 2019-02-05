/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { FilterBar, FilterBarLoading } from '../../functional';
import { getFilterBarQuery } from './get_filter_bar';

interface FilterBarProps {
  updateQuery: (query: object | undefined) => void;
}

type Props = FilterBarProps & UptimeCommonProps;

export const FilterBarQuery = ({
  autorefreshInterval,
  autorefreshIsPaused,
  dateRangeStart,
  dateRangeEnd,
  updateQuery,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getFilterBarQuery}
    variables={{ dateRangeStart, dateRangeEnd }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return <FilterBarLoading />;
      }
      if (error) {
        return i18n.translate('xpack.uptime.filterBar.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const { filterBar } = data;
      return <FilterBar filterBar={filterBar} updateQuery={updateQuery} />;
    }}
  </Query>
);
