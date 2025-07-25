/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment from 'moment';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { downloadJson } from '../../../../utils/download_json';
import { DiagnosticConfigurationForm } from './diagnostic_configuration_form';
import { DiagnosticResults } from './diagnostic_results';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import type { DiagnosticFormState } from './types';

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
  const [data, setData] = useState<{
    analysis: {
      exitSpans: {
        found: boolean;
        totalConnections: number;
        spans: any[];
        hasMatchingDestinationResources: boolean;
      };
      parentRelationships: {
        found: boolean;
        documentCount: number;
        sourceSpanIds: string[];
      };
    };
    elasticsearchResponses: {
      exitSpansQuery?: any;
      sourceSpanIdsQuery?: any;
      destinationParentIdsQuery?: any;
    };
  }>();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<DiagnosticFormState>({
    sourceNode: null,
    destinationNode: null,
    traceId: '',
    isValid: false,
  });

  const handleSelectionUpdate = React.useCallback(
    ({ sourceNode, destinationNode, traceId, isValid }: DiagnosticFormState) => {
      setForm({
        sourceNode,
        destinationNode,
        traceId,
        isValid,
      });
    },
    []
  );

  const handleRunDiagnostic = async () => {
    setIsLoading(true);

    if (
      start &&
      end &&
      selectedNode?.id &&
      form.sourceNode &&
      form.destinationNode &&
      form.traceId
    ) {
      const response = await callApmApi('POST /internal/apm/diagnostics/service-map', {
        params: {
          body: {
            start,
            end,
            destinationNode: form.destinationNode,
            sourceNode: form.sourceNode,
            traceId: form.traceId,
          },
        },
        signal: null,
      });

      setData(response);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  // if (isEmpty(selectedNode)) return onClose();

  return (
    <EuiFlyoutResizable
      ownFocus
      onClose={onClose}
      size="m"
      type="push"
      style={{ zIndex: 20000 }}
      maxWidth={1000}
      data-test-subj="diagnosticFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="flexStart" alignItems="baseline" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.title', {
                  defaultMessage: 'Diagnostic tool',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
          padding: '16px',
        }}
      >
        <DiagnosticConfigurationForm
          selectedNode={selectedNode}
          onSelectionUpdate={handleSelectionUpdate}
        />
        <EuiSpacer size="m" />

        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : data ? (
          <DiagnosticResults
            data={data}
            sourceNodeName={form?.sourceNode?.value}
            destinationNodeName={form?.destinationNode?.value}
          />
        ) : null}
        <EuiSpacer size="m" />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          <EuiButton
            disabled={!form.isValid}
            data-test-subj="apmDiagnosticRunButton"
            onClick={handleRunDiagnostic}
          >
            {i18n.translate('xpack.apm.diagnosticFlyout.closeButtonLabel', {
              defaultMessage: 'Run diagnostic',
            })}
          </EuiButton>
          <EuiButton
            data-test-subj="diagnosticFlyoutDownloadReportButton"
            iconType="download"
            isDisabled={!form.isValid}
            onClick={() =>
              downloadJson({
                fileName: `diagnostic-tool-apm-service-map-${moment(Date.now()).format(
                  'YYYYMMDDHHmmss'
                )}.json`,
                data: {
                  filters: {
                    rangeFrom,
                    rangeTo,
                  },
                },
              })
            }
            fill
          >
            {i18n.translate('xpack.apm.storageExplorer.downloadReport', {
              defaultMessage: 'Download report',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
