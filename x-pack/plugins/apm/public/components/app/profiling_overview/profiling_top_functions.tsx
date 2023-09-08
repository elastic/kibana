/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFunctions } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { toKueryFilterFormat } from '../../../../common/utils/to_kuery_filter_format';
import { HOST_NAME } from '../../../../common/es_fields/apm';
import { HostnamesFilterWarning } from './host_names_filter_warning';

interface Props {
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  startIndex: number;
  endIndex: number;
}

export function ProfilingTopNFunctions({
  serviceName,
  start,
  end,
  environment,
  startIndex,
  endIndex,
}: Props) {
  const { profilingLocators } = useProfilingPlugin();

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/functions',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              kuery: '',
              environment,
              startIndex,
              endIndex,
            },
          },
        }
      );
    },
    [serviceName, start, end, environment, startIndex, endIndex]
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
                kuery: hostNamesKueryFormat,
              })}
            >
              {i18n.translate('xpack.apm.profiling.flamegraph.link', {
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
