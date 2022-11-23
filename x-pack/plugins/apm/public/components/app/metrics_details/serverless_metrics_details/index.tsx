/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ServerlessMetrics } from '../../metrics/serverless_metrics';
import { getServerlessFunctionNameFromId } from '../../../../../common/serverless';
import { useBreadcrumb } from '../../../../context/breadcrumbs/use_breadcrumb';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';

interface Props {
  serverlessId: string;
}

export function ServerlessMetricsDetails({ serverlessId }: Props) {
  const apmRouter = useApmRouter();
  const { path, query } = useApmParams('/services/{serviceName}/metrics/{id}');

  const serverlessFunctionName = useMemo(
    () => getServerlessFunctionNameFromId(serverlessId),
    [serverlessId]
  );

  useBreadcrumb(
    () => ({
      title: serverlessFunctionName,
      href: apmRouter.link('/services/{serviceName}/metrics/{id}', {
        path,
        query,
      }),
    }),
    [apmRouter, path, query, serverlessFunctionName]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle>
          <h2>{serverlessFunctionName}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <ServerlessMetrics serverlessId={serverlessId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
