/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { AuthenticationTable } from '../../components/authentications_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useAuthentications } from '../../containers/authentications';
import { HostsComponentsQueryProps } from './types';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
  MatrixHistogramConfigs,
} from '../../../common/components/matrix_histogram/types';
import { HostsKpiChartColors } from '../../components/kpi_hosts/types';
import * as i18n from '../translations';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';

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
  const { observability } = useKibana<StartServices>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  return (
    <>
      <EuiPanel color="transparent" hasBorder style={{ height: 300 }}>
        <ExploratoryViewEmbeddable
          appId="security"
          title={'Authentications'}
          reportConfigMap={reportConfigMap}
          dataTypesIndexPatterns={indexPatternList}
          reportType="event_outcome"
          attributes={[
            {
              reportDefinitions: {
                EVENT_SUCCESS: ['ALL_VALUES'],
              },
              name: 'EVENT_SUCCESS',
              dataType: 'security',
              selectedMetricField: 'EVENT_SUCCESS',
              time: { from: 'now-24h', to: 'now' },
            },
            {
              reportDefinitions: {
                EVENT_FAILURE: ['ALL_VALUES'],
              },
              name: 'EVENT_FAILURE',
              dataType: 'security',
              selectedMetricField: 'EVENT_FAILURE',
              time: { from: 'now-24h', to: 'now' },
            },
          ]}
          legendIsVisible={true}
          axisTitlesVisibility={{
            x: false,
            yLeft: false,
            yRight: false,
          }}
          disableBorder
          disableShadow
          compressed
          customHeight="100%"
        />
      </EuiPanel>
      <EuiSpacer />

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
