/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiCallOut, EuiDescriptionList, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ApmIntegrationPackageStatus } from './apm_integration_package_status';
import { IndexTemplatesStatus } from './index_templates_status';
import { FieldMappingStatus } from './indicies_status';
import { DataStreamsStatus } from './data_streams_status';
import { useDiagnosticsContext } from '../context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsSummary() {
  const { diagnosticsBundle } = useDiagnosticsContext();
  const isCrossCluster = getIsCrossCluster(diagnosticsBundle);
  const hasAllPrivileges = diagnosticsBundle?.diagnosticsPrivileges.hasAllPrivileges ?? true;

  if (isCrossCluster || !hasAllPrivileges) {
    return (
      <>
        {isCrossCluster && (
          <>
            <CrossClusterSearchCallout />
            <EuiSpacer />
          </>
        )}
        {diagnosticsBundle && !hasAllPrivileges && (
          <PrivilegesCallout diagnosticsBundle={diagnosticsBundle} />
        )}
      </>
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

function CrossClusterSearchCallout() {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.apm.crossClusterSearchCallout.euiCallOut.crossClusterSearchNotLabel',
        { defaultMessage: 'Cross cluster search not supported' }
      )}
      color="warning"
    >
      <FormattedMessage
        id="xpack.apm.diagnosticsSummaryTab.CrossClusterSearchCalloutText"
        defaultMessage={
          'The APM index settings is targetting remote clusters. Please note that this is not currently supported by the Diagnostics Tool and functionality will therefore be limited.'
        }
      />
    </EuiCallOut>
  );
}

function PrivilegesCallout({ diagnosticsBundle }: { diagnosticsBundle: DiagnosticsBundle }) {
  const missingClusterPrivileges = Object.entries(diagnosticsBundle.diagnosticsPrivileges.cluster)
    .filter(([privilegeName, hasPrivilege]) => !hasPrivilege)
    .map(([privilegeName]) => privilegeName);

  const missingIndexPrivileges = Object.entries(diagnosticsBundle.diagnosticsPrivileges.index)
    .filter(([indexName, privObject]) => !privObject.read)
    .map(([indexName, privObject]) => indexName);

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.apm.privilegesCallout.euiCallOut.insufficientAccessLabel', {
          defaultMessage: 'Insufficient access',
        })}
        color="warning"
      >
        {i18n.translate('xpack.apm.privilegesCallout.notAllFeaturesAreCallOutLabel', {
          defaultMessage: 'Not all features are available due to missing privileges.',
        })}
        <br />
        <br />
        <EuiDescriptionList
          listItems={[
            ...(missingClusterPrivileges.length > 0
              ? [
                  {
                    title: i18n.translate(
                      'xpack.apm.diagnosticsSummaryTab.missingClusterPrivilegesTitle',
                      {
                        defaultMessage: 'Missing cluster privileges',
                      }
                    ),
                    description: missingClusterPrivileges.join(', '),
                  },
                ]
              : []),

            ...(missingIndexPrivileges.length > 0
              ? [
                  {
                    title: i18n.translate(
                      'xpack.apm.diagnosticsSummaryTab.missingIndexPrivilegesTitle',
                      {
                        defaultMessage: 'Missing index privileges',
                      }
                    ),
                    description: missingIndexPrivileges.join(', '),
                  },
                ]
              : []),
          ]}
        />
      </EuiCallOut>
    </>
  );
}

export function getIsCrossCluster(diagnosticsBundle?: DiagnosticsBundle) {
  return Object.values(diagnosticsBundle?.apmIndices ?? {}).some((indicies) =>
    indicies.includes(':')
  );
}
