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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { downloadJson } from '../../../../utils/download_json';
import { HighlightedExitSpansTable } from './diagnostic_highlighted_exit_spans_table';
import { DiagnosticConfigurationForm } from './diagnostic_configuration_form';
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
  const [data, setData] = useState();
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
      console.log('form in front', form);
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
      style={{ zIndex: 11000 }}
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
      <EuiFlyoutBody>
        <DiagnosticConfigurationForm
          selectedNode={selectedNode}
          onSelectionUpdate={handleSelectionUpdate}
        />
        <EuiSpacer size="m" />

        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : data ? (
          data?.response?.exitSpans?.exitSpans?.length > 0 ? (
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
              <HighlightedExitSpansTable items={data?.response?.exitSpans?.exitSpans} />
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
