/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostsComponentsQueryProps } from './types';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import { AuthenticationsHostTable } from '../../../common/components/authentication/authentications_host_table';
import { histogramConfigs } from '../../../common/components/authentication/helpers';

const HISTOGRAM_QUERY_ID = 'authenticationsHistogramQuery';

const AuthenticationsQueryTabBodyComponent: React.FC<HostsComponentsQueryProps> = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}) => {
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

      <AuthenticationsHostTable
        endDate={endDate}
        filterQuery={filterQuery}
        indexNames={indexNames}
        setQuery={setQuery}
        deleteQuery={deleteQuery}
        startDate={startDate}
        type={type}
        skip={skip}
        docValueFields={docValueFields}
      />
    </>
  );
};

AuthenticationsQueryTabBodyComponent.displayName = 'AuthenticationsQueryTabBodyComponent';

export const AuthenticationsQueryTabBody = React.memo(AuthenticationsQueryTabBodyComponent);

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
