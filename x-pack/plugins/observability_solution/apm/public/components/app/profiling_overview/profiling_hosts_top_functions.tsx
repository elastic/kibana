/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { ApmDataSourceWithSummary } from '../../../../common/data_source';
import { ApmDocumentType } from '../../../../common/document_type';
import { HOST_NAME } from '../../../../common/es_fields/apm';
import { mergeKueries, toKueryFilterFormat } from '../../../../common/utils/kuery_utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingTopNFunctionsLink } from '../../shared/profiling/top_functions/top_functions_link';
import { HostnamesFilterWarning } from './host_names_filter_warning';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  startIndex: number;
  endIndex: number;
  dataSource?: ApmDataSourceWithSummary<
    ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent
  >;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}

export function ProfilingHostsTopNFunctions({
  serviceName,
  start,
  end,
  environment,
  startIndex,
  endIndex,
  dataSource,
  kuery,
  rangeFrom,
  rangeTo,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (dataSource) {
        return callApmApi('GET /internal/apm/services/{serviceName}/profiling/hosts/functions', {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
              startIndex,
              endIndex,
              documentType: dataSource.documentType,
              rollupInterval: dataSource.rollupInterval,
              kuery,
            },
          },
        });
      }
    },
    [dataSource, serviceName, start, end, environment, startIndex, endIndex, kuery]
  );

  const hostNamesKueryFormat = toKueryFilterFormat(HOST_NAME, data?.hostNames || []);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <HostnamesFilterWarning hostNames={data?.hostNames} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ProfilingTopNFunctionsLink
            kuery={mergeKueries([`(${hostNamesKueryFormat})`, kuery])}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            justifyContent="flexEnd"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EmbeddableFunctions
        data={data?.functions}
        isLoading={isPending(status)}
        rangeFrom={new Date(start).valueOf()}
        rangeTo={new Date(end).valueOf()}
      />
    </>
  );
}
