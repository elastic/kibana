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
import { hostsModel } from '../../store';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  MatrixHistogramConfigs,
} from '../../../common/components/matrix_histogram/types';
import { MatrixHistogramContainer } from '../../../common/components/matrix_histogram';
import { KpiHostsChartColors } from '../../components/kpi_hosts/types';
import * as i18n from '../translations';
import { HistogramType } from '../../../graphql/types';

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const ID = 'authenticationsOverTimeQuery';
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
  histogramType: HistogramType.authentications,
  mapping: authMatrixDataMappingFields,
  stackByOptions: authStackByOptions,
  title: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
};

export const AuthenticationsQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAuthentications({ docValueFields, endDate, filterQuery, startDate, type });

  return (
    <>
      <MatrixHistogramContainer
        endDate={endDate}
        filterQuery={filterQuery}
        id={ID}
        setQuery={setQuery}
        sourceId="default"
        startDate={startDate}
        type={hostsModel.HostsType.page}
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

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
