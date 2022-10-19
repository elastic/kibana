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

interface Props {
  serverlessId: string;
}

export function ServerlessMetricsDetails({ serverlessId }: Props) {
  const serverlessFunctionName = useMemo(
    () => getServerlessFunctionNameFromId(serverlessId),
    [serverlessId]
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
