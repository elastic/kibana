/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
} from '@elastic/eui';

import SourceIcon from 'workplace_search/components/SourceIcon';

interface SourceInfoCardProps {
  sourceName: string;
  sourceType: string;
  dateCreated: string;
  isFederatedSource: boolean;
}

export const SourceInfoCard: React.FC<SourceInfoCardProps> = ({
  sourceName,
  sourceType,
  dateCreated,
  isFederatedSource,
}) => (
  <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
    <EuiFlexItem>
      <EuiDescriptionList textStyle="reverse" className="content-source-meta">
        <EuiDescriptionListTitle>
          <span className="content-source-meta__title">Connector</span>
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            className="content-source-meta__content"
          >
            <EuiFlexItem grow={false}>
              <SourceIcon
                className="content-source-meta__icon"
                serviceType={sourceType}
                name={sourceType}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <span title={sourceName} className="eui-textTruncate">
                {sourceName}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiSpacer className="euiSpacer--vertical" />
    </EuiFlexItem>
    <EuiFlexItem grow={isFederatedSource}>
      <EuiDescriptionList textStyle="reverse" className="content-source-meta">
        <EuiDescriptionListTitle>
          <span className="content-source-meta__title">Created</span>
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            className="content-source-meta__content"
          >
            <EuiFlexItem>{dateCreated}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    {isFederatedSource && (
      <>
        <EuiFlexItem grow={false}>
          <EuiSpacer className="euiSpacer--vertical" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList textStyle="reverse" className="content-source-meta">
            <EuiDescriptionListTitle>
              <span className="content-source-meta__title">Status</span>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                className="content-source-meta__content"
              >
                <EuiFlexItem>
                  <EuiHealth color="success">Ready to search</EuiHealth>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </>
    )}
  </EuiFlexGroup>
);
