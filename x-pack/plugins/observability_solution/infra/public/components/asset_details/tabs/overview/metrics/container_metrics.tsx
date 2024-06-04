/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexGrid } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DockerCharts } from '../../../charts/docker_charts';
import { INTEGRATIONS } from '../../../constants';
import { useIntegrationCheck } from '../../../hooks/use_integration_check';
import { KubernetesContainerCharts } from '../../../charts/kubernetes_charts';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
}

export const ContainerMetrics = (props: Props) => {
  const isK8sContainer = useIntegrationCheck({ dependsOn: INTEGRATIONS.kubernetesContainer });

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexGrid columns={2} gutterSize="s">
        {isK8sContainer ? (
          <>
            <KubernetesContainerCharts {...props} metric="cpu" />
            <KubernetesContainerCharts {...props} metric="memory" />
          </>
        ) : (
          <>
            <DockerCharts {...props} metric="cpu" />
            <DockerCharts {...props} metric="memory" />
          </>
        )}
      </EuiFlexGrid>
    </EuiFlexGroup>
  );
};
