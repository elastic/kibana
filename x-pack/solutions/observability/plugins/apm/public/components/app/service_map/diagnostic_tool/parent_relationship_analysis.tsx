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
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ParentRelationshipAnalysisProps {
  hasParent: boolean;
  destinationHits: any[];
  destinationResponse: any;
  sourceNodeName: string;
  destinationNodeName: string;
}

export function ParentRelationshipAnalysis({
  hasParent,
  destinationHits,
  destinationResponse,
  sourceNodeName,
  destinationNodeName,
}: ParentRelationshipAnalysisProps) {
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
                    values: { destinationNode: destinationNodeName },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                {destinationHits.length}{' '}
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: 'documents',
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.apm.serviceMap.diagnosticResults.parentIdsFoundDescription', {
                defaultMessage:
                  'Found {count} document(s) showing parent relationships pointing to {destinationNode} from {sourceNode} during the selected time range.',
                values: {
                  count: destinationHits.length,
                  destinationNode: destinationNodeName,
                  sourceNode: sourceNodeName,
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
                    values: { destinationNode: destinationNodeName },
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {destinationHits.length}{' '}
                {i18n.translate('xpack.apm.diagnosticResults.documentsBadgeLabel', {
                  defaultMessage: 'documents',
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
                    'No parent IDs were found pointing from {sourceNode} to {destinationNode} during the selected time range. Found {count} total document(s) for analysis.',
                  values: {
                    sourceNode: sourceNodeName,
                    destinationNode: destinationNodeName,
                    count: destinationHits.length,
                  },
                }
              )}
            </p>
          </EuiText>
        </>
      )}

      {destinationResponse && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="parentIdsDetails"
            buttonContent={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.apm.serviceMap.diagnosticResults.viewQueryDetails', {
                    defaultMessage: 'View query details',
                  })}
                </strong>
              </EuiText>
            }
            paddingSize="none"
          >
            <EuiSpacer size="s" />
            <EuiDescriptionList compressed>
              <EuiDescriptionListTitle>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.queryTook', {
                  defaultMessage: 'Query time',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {destinationResponse.took}
                {i18n.translate('xpack.apm.diagnosticResults.msDescriptionListDescriptionLabel', {
                  defaultMessage: 'ms',
                })}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.totalShards', {
                  defaultMessage: 'Shards',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {destinationResponse._shards?.successful}/{destinationResponse._shards?.total}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                {i18n.translate('xpack.apm.serviceMap.diagnosticResults.totalHits', {
                  defaultMessage: 'Total hits',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {destinationResponse.hits?.total?.value || 0}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
}
