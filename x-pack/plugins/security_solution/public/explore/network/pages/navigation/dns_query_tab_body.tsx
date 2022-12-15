/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { getOr } from 'lodash/fp';

import { NetworkDnsTable } from '../../components/network_dns_table';
import { useNetworkDns, ID } from '../../containers/network_dns';
import { manageQuery } from '../../../../common/components/page/manage_query';

import type { NetworkComponentQueryProps } from './types';

import type {
  MatrixHistogramOption,
  MatrixHistogramConfigs,
} from '../../../../common/components/matrix_histogram/types';
import * as i18n from './translations';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution';
import { networkSelectors } from '../../store';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { dnsTopDomainsLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/dns_top_domains';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

const HISTOGRAM_ID = 'networkDnsHistogramQuery';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

const dnsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'dns.question.registered_domain',
    value: 'dns.question.registered_domain',
  },
];

const DEFAULT_STACK_BY = 'dns.question.registered_domain';

export const histogramConfigs: Omit<MatrixHistogramConfigs, 'title'> = {
  defaultStackByOption:
    dnsStackByOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? dnsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_DNS_DATA,
  histogramType: MatrixHistogramType.dns,
  stackByOptions: dnsStackByOptions,
  subtitle: undefined,
  lensAttributes: dnsTopDomainsLensAttributes,
};

const DnsQueryTabBodyComponent: React.FC<NetworkComponentQueryProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  setQuery,
  type,
}) => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const isPtrIncluded = useShallowEqualSelector(
    (state) => getNetworkDnsSelector(state).isPtrIncluded
  );

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);
  const queryId = `${ID}-${type}`;
  const { toggleStatus } = useQueryToggle(queryId);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [
    loading,
    { totalCount, networkDns, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useNetworkDns({
    endDate,
    filterQuery,
    id: queryId,
    indexNames,
    skip: querySkip,
    startDate,
  });

  const getTitle = useCallback(
    (option: MatrixHistogramOption) => i18n.DOMAINS_COUNT_BY(option.text),
    []
  );

  const dnsHistogramConfigs: MatrixHistogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      title: getTitle,
    }),
    [getTitle]
  );

  return (
    <>
      <MatrixHistogram
        id={HISTOGRAM_ID}
        isPtrIncluded={isPtrIncluded}
        endDate={endDate}
        filterQuery={filterQuery}
        indexNames={indexNames}
        setQuery={setQuery}
        showLegend={true}
        startDate={startDate}
        {...dnsHistogramConfigs}
      />
      <NetworkDnsTableManage
        data={networkDns}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        loading={loading}
        loadPage={loadPage}
        refetch={refetch}
        setQuery={setQuery}
        setQuerySkip={setQuerySkip}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        totalCount={totalCount}
        type={type}
      />
    </>
  );
};

DnsQueryTabBodyComponent.displayName = 'DnsQueryTabBodyComponent';

export const DnsQueryTabBody = React.memo(DnsQueryTabBodyComponent);
