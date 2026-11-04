/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import React from 'react';
import type { ApmDataSourceWithSummary } from '../../../../common/data_source';
import type { ApmDocumentType } from '../../../../common/document_type';
import { getProfilingScopeKuery } from '../../../../common/profiling/hosts_scope';
import { mergeKueries } from '../../../../common/utils/kuery_utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingTopNFunctionsLink } from '../../shared/profiling/top_functions/top_functions_link';
import { FilterWarning } from './filter_warning';

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
  /** Undefined until a schema is selected, which the request waits for */
  schema?: ProfilingSchema;
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
  schema,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (dataSource && schema) {
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
              schema,
            },
          },
        });
      }
    },
    [dataSource, schema, serviceName, start, end, environment, startIndex, endIndex, kuery]
  );

  const profilingKueryFilter = data ? getProfilingScopeKuery(data) : '';

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <FilterWarning
            scope={data?.scope}
            containerIds={data?.containerIds}
            hostNames={data?.hostNames}
            workloadNames={data?.workloadNames}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ProfilingTopNFunctionsLink
            kuery={mergeKueries([profilingKueryFilter, kuery])}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            schema={schema}
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
