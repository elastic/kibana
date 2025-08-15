/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  EuiPanel,
  EuiAccordion,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HighlightedExitSpansTable } from './diagnostic_highlighted_exit_spans_table';
import type { ExitSpanFields } from '../../../../../common/service_map_diagnostic_types';

interface ExitSpansAnalysisProps {
  hasMatchingDestinationResources: boolean;
  totalConnections: number;
  apmExitSpans: ExitSpanFields[];
  destinationNode: string;
  sourceNode: string;
}
export function ExitSpansAnalysis({
  hasMatchingDestinationResources,
  totalConnections,
  apmExitSpans = [],
  destinationNode,
  sourceNode,
}: ExitSpansAnalysisProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel paddingSize="m" color="subdued">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansTitle', {
            defaultMessage: 'Exit Spans Analysis',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {hasMatchingDestinationResources ? (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansFound', {
                    defaultMessage: 'Exit spans found for {sourceNode} → {destinationNode}',
                    values: { sourceNode, destinationNode },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {totalConnections}{' '}
                {i18n.translate('xpack.apm.diagnosticResults.connectionsBadgeLabel', {
                  defaultMessage: 'connections',
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansFoundDescription', {
                defaultMessage:
                  'Found {count} exit span(s) from {sourceNode} during the selected time range. These represent all outbound connections that were traced from this {sourceNode}.',
                values: {
                  count: apmExitSpans.length,
                  sourceNode,
                },
              })}
            </p>
          </EuiText>
        </>
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="crossInCircle" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansNotFound', {
                    defaultMessage: 'No exit spans found for {sourceNode} → {destinationNode}',
                    values: {
                      sourceNode,
                      destinationNode,
                    },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceMap.diagnosticResults.exitSpansNotFoundDescription',
                {
                  defaultMessage:
                    'No exit spans were found from {sourceNode} to {destinationNode} during the selected time range. This could indicate:',
                  values: { sourceNode, destinationNode },
                }
              )}
            </p>
            <ul style={{ marginTop: euiTheme.size.s, paddingLeft: euiTheme.size.base }}>
              <li>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansNotFoundReason1', {
                  defaultMessage: 'An instrumentation issue preventing proper span collection',
                })}
              </li>
              <li>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.exitSpansNotFoundReason2', {
                  defaultMessage: 'The trace/connection was not found during this time range',
                })}
              </li>
            </ul>
          </EuiText>
        </>
      )}

      {apmExitSpans.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="exitSpansDetails"
            buttonContent={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.viewConnectionDetails', {
                    defaultMessage: 'View exit spans found',
                  })}
                </strong>
              </EuiText>
            }
            paddingSize="none"
          >
            <EuiSpacer size="s" />
            <HighlightedExitSpansTable items={apmExitSpans} />
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
}
