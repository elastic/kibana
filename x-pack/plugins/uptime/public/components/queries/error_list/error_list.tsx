/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { ErrorList } from '../../functional';
import { getErrorListQuery } from './get_error_list';

interface ErrorListProps {
  filters?: string;
}

type Props = ErrorListProps & UptimeCommonProps;

export const ErrorListQuery = ({
  autorefreshInterval,
  autorefreshIsPaused,
  dateRangeStart,
  dateRangeEnd,
  filters,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getErrorListQuery}
    variables={{ dateRangeStart, dateRangeEnd, filters }}
  >
    {({ loading, error, data }) => {
      if (error) {
        return i18n.translate('xpack.uptime.errorList.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const { errorList } = data;
      return <ErrorList loading={loading} errorList={errorList} />;
    }}
  </Query>
);
