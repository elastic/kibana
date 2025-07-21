/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiLoadingSpinner,
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { HighlightedExitSpansTable } from './highlighted_exit_spans_table';
import { DiagnoseMissingConnectionPanel } from './diagnose_missing_connection_panel';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
// import { callApmApi } from '../../../services/rest/create_call_apm_api';

interface DiagnosticFlyoutProps {
  onClose: () => void;
  isOpen: boolean;
  selectedNode: cytoscape.NodeSingular | cytoscape.EdgeSingular | undefined;
}

export function DiagnosticFlyout({ onClose, isOpen, selectedNode }: DiagnosticFlyoutProps) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  // const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  // const handleCheck = () => {
  //   setDiagnosticResult(
  //     i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.noDataFound', {
  //       defaultMessage: 'Checked: No service.destination.resource.data found for this dependency.',
  //     })
  //   );
  // };

  const handleRunDiagnostic = async (
    traceId: string,
    service: string,
    dependencyService: string
  ) => {
    setIsRunningDiagnostic(true);

    if (start && end) {
      return await callApmApi('GET /internal/apm/diagnostics/service-map/{nodeName}', {
        params: {
          path: {
            nodeName: selectedNode?.id,
          },
          query: {
            start,
            end,
          },
        },
      });
    }
  };

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/diagnostics/service-map/{nodeName}', {
          params: {
            path: {
              nodeName: selectedNode?.id,
            },
            query: {
              start,
              end,
            },
          },
        });
      }
    },
    [start, end, selectedNode]
  );

  if (!isOpen) return null;
  if (isEmpty(selectedNode)) return onClose();

  return (
    <EuiFlyoutResizable
      ownFocus
      onClose={onClose}
      size="m"
      type="push"
      // maxWidth={500}
      data-test-subj="diagnosticFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.title', {
              defaultMessage: 'Diagnostic tool',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DiagnoseMissingConnectionPanel
          onRunDiagnostic={handleRunDiagnostic}
          selectedNode={selectedNode}
        />
        <EuiSpacer size="m" />

        {isPending(status) ? (
          <EuiLoadingSpinner size="xl" />
        ) : data ? (
          data.hasConnections ? (
            <>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.apm.serviceMap.diagnosticFlyout.highlightedExitSpansTitle',
                    {
                      defaultMessage: 'Connections found',
                    }
                  )}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <HighlightedExitSpansTable items={data.connections} />
            </>
          ) : (
            <>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.noConnectionsTitle', {
                    defaultMessage: 'No connections found',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText color="subdued">
                <p>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.noConnectionsMessage', {
                    defaultMessage:
                      'No connections were found between the specified services during the selected time range.',
                  })}
                </p>
              </EuiText>
            </>
          )
        ) : null}
        <EuiSpacer size="m" />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          <EuiButton data-test-subj="apmDiagnosticFlyoutCloseButton" onClick={handleRunDiagnostic}>
            {i18n.translate('xpack.apm.diagnosticFlyout.closeButtonLabel', {
              defaultMessage: 'Run diagnostic',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
