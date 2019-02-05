/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { Snapshot } from '../../functional';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotProps {
  filters?: string;
}

type Props = SnapshotProps & UptimeCommonProps;

export const SnapshotQuery = ({
  autorefreshIsPaused,
  autorefreshInterval,
  colors: { primary, danger },
  dateRangeStart,
  dateRangeEnd,
  filters,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getSnapshotQuery}
    variables={{ dateRangeStart, dateRangeEnd, filters }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.snapshot.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.snapshot.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const { snapshot } = data;

      return <Snapshot dangerColor={danger} primaryColor={primary} snapshot={snapshot} />;
    }}
  </Query>
);
