/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EmbeddableProfilingSchemaSelectorProps } from '@kbn/observability-shared-plugin/public';
import {
  EmbeddableProfilingSchemaSelector,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';

type Props = Pick<
  EmbeddableProfilingSchemaSelectorProps,
  'schemas' | 'isLoadingSchemas' | 'schemasError'
>;

export function ProfilingSchemaSelectorBase({ schemas, isLoadingSchemas, schemasError }: Props) {
  const { schema, setSchema } = useProfilingSchemaState();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EmbeddableProfilingSchemaSelector
          schema={schema}
          onSchemaChange={setSchema}
          schemas={schemas}
          isLoadingSchemas={isLoadingSchemas}
          schemasError={schemasError}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface TransactionsProps {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  kuery: string;
  transactionName?: string;
  transactionType?: string;
}

export function ProfilingSchemaSelector({
  serviceName,
  start,
  end,
  environment,
  kuery,
  transactionName,
  transactionType,
}: TransactionsProps) {
  const { data, status, error } = useFetcher(
    (callApmApi) => {
      if (transactionType) {
        return callApmApi('GET /internal/apm/services/{serviceName}/profiling/schemas', {
          params: {
            path: { serviceName },
            query: { start, end, environment, kuery, transactionName, transactionType },
          },
        });
      }
    },
    [serviceName, start, end, environment, kuery, transactionName, transactionType],
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
