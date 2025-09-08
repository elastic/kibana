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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ParentRelationshipAnalysisProps {
  hasParent: boolean;
  destinationHits: any[];
  sourceNode: string;
  destinationNode: string;
}

export function ParentRelationshipAnalysis({
  hasParent,
  destinationHits,
  sourceNode,
  destinationNode,
}: ParentRelationshipAnalysisProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel paddingSize="m" color="subdued">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsTitle', {
            defaultMessage: 'Parent Relationship Analysis',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {hasParent ? (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsFound', {
                    defaultMessage: 'Parent relationships found for {destinationNode}',
                    values: { destinationNode },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: '{count, plural, one {# document} other {# documents}}',
                  values: {
                    count: destinationHits.length,
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsFoundDescription', {
                defaultMessage:
                  'Found {count, plural, one {# document} other {# documents}} showing parent relationships pointing to {destinationNode} from {sourceNode} during the selected time range.',
                values: {
                  count: destinationHits.length,
                  destinationNode,
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
              <EuiIcon type="alert" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsNotFound', {
                    defaultMessage: 'No parent relationships found for {destinationNode}',
                    values: { destinationNode },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: '{count, plural, one {# document} other {# documents}}',
                  values: {
                    count: destinationHits.length,
                  },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.apm.serviceMap.diagnosticResults.parentIdsNotFoundDescription',
                {
                  defaultMessage:
                    'No parent IDs were found pointing from {sourceNode} to {destinationNode} during the selected time range. Found {count, plural, one {# document} other {# documents}} for analysis. This could indicate:',
                  values: {
                    sourceNode,
                    destinationNode,
                    count: destinationHits.length,
                  },
                }
              )}
            </p>
            <ul style={{ marginTop: euiTheme.size.s, paddingLeft: euiTheme.size.base }}>
              <li>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsNotFoundReason1', {
                  defaultMessage: 'An instrumentation issue preventing proper trace correlation',
                })}
              </li>
              <li>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsNotFoundReason2', {
                  defaultMessage: 'Missing distributed tracing configuration between services',
                })}
              </li>
            </ul>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
}
