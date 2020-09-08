/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect } from 'react';
import { AuthenticationTable } from '../../components/authentications_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useAuthentications } from '../../containers/authentications';
import { HostsComponentsQueryProps } from './types';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  MatrixHistogramConfigs,
} from '../../../common/components/matrix_histogram/types';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import { KpiHostsChartColors } from '../../components/kpi_hosts/types';
import * as i18n from '../translations';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';

const AuthenticationTableManage = manageQuery(AuthenticationTable);

const ID = 'authenticationsHistogramQuery';

const authStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.outcome',
    value: 'event.outcome',
  },
];
const DEFAULT_STACK_BY = 'event.outcome';

enum AuthMatrixDataGroup {
  authSuccess = 'success',
  authFailure = 'failure',
}

export const authMatrixDataMappingFields: MatrixHistogramMappingTypes = {
  [AuthMatrixDataGroup.authSuccess]: {
    key: AuthMatrixDataGroup.authSuccess,
    value: null,
    color: KpiHostsChartColors.authSuccess,
  },
  [AuthMatrixDataGroup.authFailure]: {
    key: AuthMatrixDataGroup.authFailure,
    value: null,
    color: KpiHostsChartColors.authFailure,
  },
};

const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    authStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? authStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_AUTHENTICATIONS_DATA,
  histogramType: MatrixHistogramType.authentications,
  mapping: authMatrixDataMappingFields,
  stackByOptions: authStackByOptions,
  title: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
};

const AuthenticationsQueryTabBodyComponent: React.FC<HostsComponentsQueryProps> = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}) => {
  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAuthentications({ docValueFields, endDate, filterQuery, skip, startDate, type });

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={filterQuery}
        id={ID}
        setQuery={setQuery}
        startDate={startDate}
        {...histogramConfigs}
      />

      <AuthenticationTableManage
        data={authentications}
        deleteQuery={deleteQuery}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        loading={loading}
        loadPage={loadPage}
        refetch={refetch}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        setQuery={setQuery}
        totalCount={totalCount}
        type={type}
      />
    </>
  );
};

AuthenticationsQueryTabBodyComponent.displayName = 'AuthenticationsQueryTabBodyComponent';

export const AuthenticationsQueryTabBody = React.memo(AuthenticationsQueryTabBodyComponent);

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
