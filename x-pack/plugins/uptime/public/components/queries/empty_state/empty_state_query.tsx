/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { EmptyState } from '../../functional/empty_state';
import { getDocCountQuery } from './get_doc_count';

interface EmptyStateProps {
  children: JSX.Element[];
}

type Props = EmptyStateProps & UptimeCommonProps;

export const EmptyStateQuery = ({ autorefreshInterval, autorefreshIsPaused, children }: Props) => (
  <Query
    query={getDocCountQuery}
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
  >
    {({ loading, error, data }) => {
      const count = get(data, 'getDocCount.count', 0);
      return (
        <EmptyState
          children={children}
          count={count}
          error={
            error
              ? i18n.translate('xpack.uptime.emptyState.errorMessage', {
                  values: { message: error.message },
                  defaultMessage: 'Error {message}',
                })
              : undefined
          }
          loading={loading}
        />
      );
    }}
  </Query>
);
