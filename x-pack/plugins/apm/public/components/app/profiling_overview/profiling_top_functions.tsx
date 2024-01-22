/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { ApmDataSourceWithSummary } from '../../../../common/data_source';
import { ApmDocumentType } from '../../../../common/document_type';
import { HOST_NAME } from '../../../../common/es_fields/apm';
import {
  mergeKueries,
  toKueryFilterFormat,
} from '../../../../common/utils/kuery_utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
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

export function ProfilingTopNFunctions({
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
  const { profilingLocators } = useProfilingPlugin();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (dataSource) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/profiling/functions',
          {
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
          }
        );
      }
    },
    [
      dataSource,
      serviceName,
      start,
      end,
      environment,
      startIndex,
      endIndex,
      kuery,
    ]
  );

  const hostNamesKueryFormat = toKueryFilterFormat(
    HOST_NAME,
    data?.hostNames || []
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <HostnamesFilterWarning hostNames={data?.hostNames} />
        </EuiFlexItem>
        <EuiFlexItem>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <EuiLink
              data-test-subj="apmProfilingTopNFunctionsGoToUniversalProfilingFlamegraphLink"
              href={profilingLocators?.topNFunctionsLocator.getRedirectUrl({
                kuery: mergeKueries([`(${hostNamesKueryFormat})`, kuery]),
                rangeFrom,
                rangeTo,
              })}
            >
              {i18n.translate('xpack.apm.profiling.topnFunctions.link', {
                defaultMessage: 'Go to Universal Profiling Functions',
              })}
            </EuiLink>
          </div>
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
