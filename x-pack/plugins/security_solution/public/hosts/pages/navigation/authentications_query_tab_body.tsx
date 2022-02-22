/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
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
import { HostsKpiChartColors } from '../../components/kpi_hosts/types';
import * as i18n from '../translations';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import { AUTHENTICATIONS } from '../../components/authentications_table/translations';
import { authentication } from '../../configs/authentication';

const AuthenticationTableManage = manageQuery(AuthenticationTable);

const ID = 'authenticationsHistogramQuery';

const authenticationsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.outcome',
    value: 'event.outcome',
  },
];
const DEFAULT_STACK_BY = 'event.outcome';

enum AuthenticationsMatrixDataGroup {
  authenticationsSuccess = 'success',
  authenticationsFailure = 'failure',
}

export const authenticationsMatrixDataMappingFields: MatrixHistogramMappingTypes = {
  [AuthenticationsMatrixDataGroup.authenticationsSuccess]: {
    key: AuthenticationsMatrixDataGroup.authenticationsSuccess,
    value: null,
    color: HostsKpiChartColors.authenticationsSuccess,
  },
  [AuthenticationsMatrixDataGroup.authenticationsFailure]: {
    key: AuthenticationsMatrixDataGroup.authenticationsFailure,
    value: null,
    color: HostsKpiChartColors.authenticationsFailure,
  },
};

const histogramConfigs: MatrixHistogramConfigs = {
  defaultStackByOption:
    authenticationsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ??
    authenticationsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_AUTHENTICATIONS_DATA,
  histogramType: MatrixHistogramType.authentications,
  mapping: authenticationsMatrixDataMappingFields,
  stackByOptions: authenticationsStackByOptions,
  title: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
};

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
  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAuthentications({
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    skip,
    startDate,
    type,
  });

  const timerange = useMemo(() => ({ from: startDate, to: endDate }), [startDate, endDate]);

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
        indexNames={indexNames}
        setQuery={setQuery}
        startDate={startDate}
        {...histogramConfigs}
      />

      <EuiPanel color="transparent" hasBorder style={{ height: 300 }}>
        <EmbeddableHistogram
          title={AUTHENTICATIONS}
          customLensAttrs={authentication}
          customTimeRange={timerange}
          isSingleMetric={false}
        />
      </EuiPanel>

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
