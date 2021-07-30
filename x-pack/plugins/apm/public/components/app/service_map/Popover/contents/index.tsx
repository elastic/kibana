/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, { MouseEvent } from 'react';
import { Buttons } from '../Buttons';
import { Info } from '../Info';
import { ServiceStatsFetcher } from '../ServiceStatsFetcher';
import { popoverWidth } from '../../cytoscape_options';
import { Title } from './title';
import { Externals } from './externals';
import { Service } from './service';

interface ContentsProps {
  isService: boolean;
  label: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
  selectedNodeServiceName: string;
}

function getContentsComponent(selectedNodeData: cytoscape.NodeDataDefinition) {
  if (
    selectedNodeData.groupedConnections &&
    Array.isArray(selectedNodeData.groupedConnections)
  ) {
    return Externals;
  }

  return Service;
}

export function Contents({
  selectedNodeData,
  isService,
  label,
  onFocusClick,
  selectedNodeServiceName,
}: ContentsProps) {
  const ContentsComponent = getContentsComponent(selectedNodeData);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ width: popoverWidth }}
    >
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{selectedNodeData.label ?? selectedNodeData.id}</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
      </EuiFlexItem>
      <ContentsComponent
        onFocusClick={onFocusClick}
        selectedNodeData={selectedNodeData}
      />
      {/* <EuiFlexItem>
        {isService ? (
          <ServiceStatsFetcher
            serviceName={selectedNodeServiceName}
            serviceAnomalyStats={selectedNodeData.serviceAnomalyStats}
          />
        ) : (
          <Info {...selectedNodeData} />
        )}
      </EuiFlexItem>
      {isService && (
        <Buttons
          onFocusClick={onFocusClick}
          selectedNodeServiceName={selectedNodeServiceName}
        />
      )} */}
    </EuiFlexGroup>
  );
}
