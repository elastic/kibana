/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiCallOut, EuiDescriptionList } from '@elastic/eui';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ApmIntegrationPackageStatus } from './apm_integration_package_status';
import { IndexTemplatesStatus } from './index_templates_status';
import { FieldMappingStatus } from './indicies_status';
import { DataStreamsStatus } from './data_streams_status';
import { useDiagnosticsContext } from '../context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsSummary() {
  const { diagnosticsBundle } = useDiagnosticsContext();

  if (
    diagnosticsBundle &&
    diagnosticsBundle.diagnosticsPrivileges.hasAllPrivileges === false
  ) {
    return <PrivilegesCallout diagnosticsBundle={diagnosticsBundle} />;
  }

  return (
    <>
      <CrossClusterSearchCallout diagnosticsBundle={diagnosticsBundle} />
      <EuiFlexGroup direction="column">
        <ApmIntegrationPackageStatus />
        <IndexTemplatesStatus />
        <DataStreamsStatus />
        <FieldMappingStatus />
      </EuiFlexGroup>
    </>
  );
}

function CrossClusterSearchCallout({
  diagnosticsBundle,
}: {
  diagnosticsBundle: DiagnosticsBundle | undefined;
}) {
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

  return null;
}

function PrivilegesCallout({
  diagnosticsBundle,
}: {
  diagnosticsBundle: DiagnosticsBundle;
}) {
  const missingClusterPrivileges = Object.entries(
    diagnosticsBundle.diagnosticsPrivileges.cluster
  )
    .filter(([privilegeName, hasPrivilege]) => !hasPrivilege)
    .map(([privilegeName]) => privilegeName);

  const missingIndexPrivileges = Object.entries(
    diagnosticsBundle.diagnosticsPrivileges.index
  )
    .filter(([indexName, privObject]) => !privObject.read)
    .map(([indexName, privObject]) => indexName);

  return (
    <>
      <EuiCallOut title="Insufficient access" color="warning">
        Not all features are available due to missing privileges.
        <br />
        <br />
        <EuiDescriptionList
          listItems={[
            ...(missingClusterPrivileges.length > 0
              ? [
                  {
                    title: 'Missing cluster privileges',
                    description: missingClusterPrivileges.join(', '),
                  },
                ]
              : []),

            ...(missingIndexPrivileges.length > 0
              ? [
                  {
                    title: 'Missing index privileges',
                    description: missingIndexPrivileges.join(', '),
                  },
                ]
              : []),
          ]}
        />
        <br />
      </EuiCallOut>
    </>
  );
}
