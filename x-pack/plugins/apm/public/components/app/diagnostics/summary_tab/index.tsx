/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiCallOut } from '@elastic/eui';
import { ApmIntegrationPackageStatus } from './apm_integration_package_status';
import { IndexTemplatesStatus } from './index_templates_status';
import { FieldMappingStatus } from './indicies_status';
import { DataStreamsStatus } from './data_streams_status';
import { useDiagnosticsContext } from '../context/use_diagnostics';

export function DiagnosticsSummary() {
  const { diagnosticsBundle } = useDiagnosticsContext();

  const isCrossCluster = Object.values(
    diagnosticsBundle?.apmIndices ?? {}
  ).some((indicies) => indicies.includes(':'));

  if (isCrossCluster) {
    return (
      <EuiCallOut title="Cross cluster search not supported" color="warning">
        The APM index settings is targetting remote clusters. Please note: this
        is not currently supported by the Diagnostics Tool and functionality
        will therefore be limited.
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <ApmIntegrationPackageStatus />
      <IndexTemplatesStatus />
      <DataStreamsStatus />
      <FieldMappingStatus />
    </EuiFlexGroup>
  );
}
