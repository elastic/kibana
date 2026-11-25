/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ApmDataSourceWithSummary } from '../../../../common/data_source';
import type { ApmDocumentType } from '../../../../common/document_type';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingSchemaSelectorBase } from '../../shared/profiling/schema_selector';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  dataSource?: ApmDataSourceWithSummary<
    ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent
  >;
  kuery: string;
}

export function ProfilingHostsSchemaSelector({
  serviceName,
  start,
  end,
  environment,
  dataSource,
  kuery,
}: Props) {
  const { data, status, error } = useFetcher(
    (callApmApi) => {
      if (dataSource) {
        return callApmApi('GET /internal/apm/services/{serviceName}/profiling/hosts/schemas', {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
              documentType: dataSource.documentType,
              rollupInterval: dataSource.rollupInterval,
              kuery,
            },
          },
        });
      }
    },
    [dataSource, serviceName, start, end, environment, kuery],
    // The selector tells when the schemas with data cannot be checked
    { showToastOnError: false }
  );

  return (
    <ProfilingSchemaSelectorBase
      schemas={data?.schemas}
      isLoadingSchemas={isPending(status)}
      schemasError={error}
    />
  );
}
