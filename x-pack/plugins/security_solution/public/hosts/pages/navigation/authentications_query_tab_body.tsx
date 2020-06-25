/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect } from 'react';
import { AuthenticationTable } from '../../components/authentications_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../store';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  MatrixHisrogramConfigs,
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

const histogramConfigs: MatrixHisrogramConfigs = {
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
      <AuthenticationsQuery
        endDate={endDate}
        filterQuery={filterQuery}
        skip={skip}
        sourceId="default"
        startDate={startDate}
        type={type}
      >
        {({
          authentications,
          totalCount,
          loading,
          pageInfo,
          loadPage,
          id,
          inspect,
          isInspected,
          refetch,
        }) => (
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
        )}
      </AuthenticationsQuery>
    </>
  );
};

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
