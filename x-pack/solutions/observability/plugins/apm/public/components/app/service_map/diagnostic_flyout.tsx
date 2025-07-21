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
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiCallOut,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { HighlightedExitSpansTable } from './highlighted_exit_spans_table';
import { DiagnoseMissingConnectionPanel } from './diagnose_missing_connection_panel';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

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

  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  const handleCheck = () => {
    setDiagnosticResult(
      i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.noDataFound', {
        defaultMessage: 'Checked: No service.destination.resource.data found for this dependency.',
      })
    );
  };

  const handleRunDiagnostic = async (
    traceId: string,
    service: string,
    dependencyService: string
  ) => {
    setIsRunningDiagnostic(true);
    try {
      // Simulate diagnostic process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (traceId) {
        setDiagnosticResult(
          i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.traceIdResult', {
            defaultMessage: 'Diagnostic completed for trace ID: {traceId}',
            values: { traceId },
          })
        );
      } else {
        setDiagnosticResult(
          i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.serviceConnectionResult', {
            defaultMessage: 'Diagnostic completed for connection: {service} → {dependencyService}',
            values: { service, dependencyService },
          })
        );
      }
    } catch (error) {
      setDiagnosticResult(
        i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.diagnosticError', {
          defaultMessage: 'Error running diagnostic. Please try again.',
        })
      );
    } finally {
      setIsRunningDiagnostic(false);
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
        {isPending(status) ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          data &&
          data?.response?.aggregations?.destination_resources?.buckets?.length > 0 && (
            <>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.apm.serviceMap.diagnosticFlyout.highlightedExitSpansTitle',
                    {
                      defaultMessage: 'Connections found ',
                    }
                  )}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <HighlightedExitSpansTable
                items={data?.response?.aggregations?.destination_resources?.buckets?.map(
                  (item: any) => {
                    // Defensive mapping, handle missing fields
                    const src = item?.sample_doc?.hits?.hits?.[0]?._source;
                    return {
                      'span.destination.service.resource':
                        src?.span?.destination?.service?.resource ?? '',
                      'span.subtype': src?.span?.subtype ?? '',
                      'span.id': src?.span?.id ?? '',
                      'span.type': src?.span?.type ?? '',
                      'transaction.id': src?.transaction?.id ?? '',
                      'service.node.name': src?.service?.node?.name ?? '',
                      'trace.id': src?.trace?.id ?? '',
                    };
                  }
                )}
              />
            </>
          )
        )}
        <EuiSpacer size="m" />
        <DiagnoseMissingConnectionPanel
          onRunDiagnostic={handleRunDiagnostic}
          selectedNode={selectedNode}
        />
        {diagnosticResult && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.diagnosticResultTitle', {
                defaultMessage: 'Diagnostic Result',
              })}
              color="primary"
              iconType="search"
            >
              <p>{diagnosticResult}</p>
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton data-test-subj="apmDiagnosticFlyoutCloseButton" onClick={onClose}>
          {i18n.translate('xpack.apm.diagnosticFlyout.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
