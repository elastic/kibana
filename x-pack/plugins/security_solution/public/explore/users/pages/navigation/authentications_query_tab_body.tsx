/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthenticationsUserTable } from '../../../components/authentication/authentications_user_table';
import { histogramConfigs } from '../../../components/authentication/helpers';
import type { AuthenticationsUserTableProps } from '../../../components/authentication/types';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';
export const ID = 'usersAuthenticationsQuery';

const HISTOGRAM_QUERY_ID = 'usersAuthenticationsHistogramQuery';

export const AuthenticationsQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  deleteQuery,
  userName,
}: AuthenticationsUserTableProps) => {
  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={filterQuery}
        id={HISTOGRAM_QUERY_ID}
        indexNames={indexNames}
        setQuery={setQuery}
        startDate={startDate}
        {...histogramConfigs}
      />

      <AuthenticationsUserTable
        endDate={endDate}
        filterQuery={filterQuery}
        indexNames={indexNames}
        setQuery={setQuery}
        deleteQuery={deleteQuery}
        startDate={startDate}
        type={type}
        skip={skip}
        userName={userName}
      />
    </>
  );
};

AuthenticationsQueryTabBody.displayName = 'AllUsersQueryTabBody';
