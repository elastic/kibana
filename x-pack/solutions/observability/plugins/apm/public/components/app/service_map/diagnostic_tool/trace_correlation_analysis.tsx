/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ServiceMapDiagnosticResponse } from '../../../../../common/service_map_diagnostic_types';

interface TraceCorrelationAnalysisProps {
  traceCorrelation: ServiceMapDiagnosticResponse['analysis']['traceCorrelation'];
  traceId?: string;
  sourceNode: string;
  destinationNode: string;
}

export function TraceCorrelationAnalysis({
  traceCorrelation,
  traceId,
  sourceNode,
  destinationNode,
}: TraceCorrelationAnalysisProps) {
  const { euiTheme } = useEuiTheme();

  if (!traceId || !traceCorrelation) {
    return null;
  }

  const {
    found,
    foundInSourceNode,
    foundInDestinationNode,
    sourceNodeDocumentCount,
    destinationNodeDocumentCount,
  } = traceCorrelation;

  return (
    <EuiPanel paddingSize="m" color="subdued">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceMap.diagnostics.traceCorrelation.title', {
            defaultMessage: 'Trace Correlation Analysis',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {found ? (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnostics.traceCorrelation.success', {
                    defaultMessage: 'Trace found in both {sourceNode} and {destinationNode}',
                    values: { sourceNode, destinationNode },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {sourceNodeDocumentCount + destinationNodeDocumentCount}{' '}
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: 'documents',
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.apm.serviceMap.diagnostics.traceCorrelation.successDetails', {
                defaultMessage:
                  'The trace was successfully found in both services: {sourceCount, plural, one {# document} other {# documents}} in {sourceNode} and {destinationCount, plural, one {# document} other {# documents}} in {destinationNode}. This indicates proper trace correlation between the services.',
                values: {
                  sourceCount: sourceNodeDocumentCount,
                  sourceNode,
                  destinationCount: destinationNodeDocumentCount,
                  destinationNode,
                },
              })}
            </p>
          </EuiText>
        </>
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="alert" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnostics.traceCorrelation.notFound', {
                    defaultMessage: 'Trace correlation issue detected',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: '{count, plural, one {# document} other {# documents}}',
                  values: {
                    count: sourceNodeDocumentCount + destinationNodeDocumentCount,
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceMap.diagnostics.traceCorrelation.notFoundDescription',
                {
                  defaultMessage:
                    'Trace ID {traceId} was not found in both services during the selected time range. Found {sourceCount, plural, one {# document} other {# documents}} in {sourceNode} and {destinationCount, plural, one {# document} other {# documents}} in {destinationNode}. This could indicate:',
                  values: {
                    traceId,
                    sourceCount: sourceNodeDocumentCount,
                    sourceNode,
                    destinationCount: destinationNodeDocumentCount,
                    destinationNode,
                  },
                }
              )}
            </p>
            <ul style={{ marginTop: euiTheme.size.s, paddingLeft: euiTheme.size.base }}>
              {!foundInSourceNode && (
                <li>
                  {i18n.translate(
                    'xpack.apm.serviceMap.diagnostics.traceCorrelation.missingInSource',
                    {
                      defaultMessage: 'Trace not found in source service ({sourceNode})',
                      values: { sourceNode },
                    }
                  )}
                </li>
              )}
              {!foundInDestinationNode && (
                <li>
                  {i18n.translate(
                    'xpack.apm.serviceMap.diagnostics.traceCorrelation.missingInDestination',
                    {
                      defaultMessage: 'Trace not found in destination service ({destinationNode})',
                      values: { destinationNode },
                    }
                  )}
                </li>
              )}
              <li>
                {i18n.translate(
                  'xpack.apm.serviceMap.diagnostics.traceCorrelation.timeRangeIssue',
                  {
                    defaultMessage: 'The trace may have occurred outside the selected time range',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.apm.serviceMap.diagnostics.traceCorrelation.instrumentationIssue',
                  {
                    defaultMessage: 'Missing or incomplete distributed tracing instrumentation',
                  }
                )}
              </li>
            </ul>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
}
