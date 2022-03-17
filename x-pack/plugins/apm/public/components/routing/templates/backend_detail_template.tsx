/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { ApmMainTemplate } from './apm_main_template';
import { SpanIcon } from '../../shared/span_icon';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useFetcher } from '../../../hooks/use_fetcher';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function BackendDetailTemplate({ title, children }: Props) {
  const {
    query: { backendName, rangeFrom, rangeTo },
  } = useApmParams('/backends/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const backendMetadataFetch = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/backends/metadata', {
        params: {
          query: {
            backendName,
            start,
            end,
          },
        },
      });
    },
    [backendName, start, end]
  );

  const { data: { metadata } = {} } = backendMetadataFetch;

  return (
    <ApmMainTemplate
      pageHeader={{
        pageTitle: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{backendName}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SpanIcon
                type={metadata?.spanType}
                subtype={metadata?.spanSubtype}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}
