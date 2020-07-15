/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { VisitorBreakdownChart } from '../Charts/VisitorBreakdownChart';
import { VisitorBreakdownLabel } from '../translations';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';

export const VisitorBreakdown = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/visitor-breakdown',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [end, start, serviceName, uiFilters]
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>{VisitorBreakdownLabel}</h3>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem>
          <VisitorBreakdownChart options={data?.browsers} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Browser</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <VisitorBreakdownChart options={data?.os} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Operating System</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <VisitorBreakdownChart options={data?.devices} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Device</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
