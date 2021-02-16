/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProfilingValueType } from '../../../../common/profiling';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { SearchBar } from '../../shared/search_bar';
import { ServiceProfilingFlamegraph } from './service_profiling_flamegraph';

interface ServiceProfilingProps {
  serviceName: string;
  environment?: string;
}

export function ServiceProfiling({
  serviceName,
  environment,
}: ServiceProfilingProps) {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  const valueType = ProfilingValueType.cpuTime;

  return (
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.apm.profilingOverviewTitle', {
                  defaultMessage: 'Profiling',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <ServiceProfilingFlamegraph
                serviceName={serviceName}
                environment={environment}
                valueType={valueType}
                start={start}
                end={end}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
