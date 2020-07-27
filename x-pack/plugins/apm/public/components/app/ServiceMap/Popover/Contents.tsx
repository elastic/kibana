/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, { MouseEvent } from 'react';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceStatsFetcher } from './ServiceStatsFetcher';
import { popoverWidth } from '../cytoscapeOptions';

interface ContentsProps {
  isService: boolean;
  label: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
  selectedNodeServiceName: string;
}

// IE 11 does not handle flex properties as expected. With browser detection,
// we can use regular div elements to render contents that are almost identical.
//
// This method of detecting IE is from a Stack Overflow answer:
// https://stackoverflow.com/a/21825207
//
// @ts-ignore `documentMode` is not recognized as a valid property of `document`.
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

const FlexColumnGroup = (props: {
  children: React.ReactNode;
  style: React.CSSProperties;
  direction: 'column';
  gutterSize: 's';
}) => {
  if (isIE11) {
    const { direction, gutterSize, ...rest } = props;
    return <div {...rest} />;
  }
  return <EuiFlexGroup {...props} />;
};
const FlexColumnItem = (props: { children: React.ReactNode }) =>
  isIE11 ? <div {...props} /> : <EuiFlexItem {...props} />;

export function Contents({
  selectedNodeData,
  isService,
  label,
  onFocusClick,
  selectedNodeServiceName,
}: ContentsProps) {
  return (
    <FlexColumnGroup
      direction="column"
      gutterSize="s"
      style={{ width: popoverWidth }}
    >
      <FlexColumnItem>
        <EuiTitle size="xxs">
          <h3>{label}</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
      </FlexColumnItem>
      <FlexColumnItem>
        {isService ? (
          <ServiceStatsFetcher
            serviceName={selectedNodeServiceName}
            serviceAnomalyStats={selectedNodeData.serviceAnomalyStats}
          />
        ) : (
          <Info {...selectedNodeData} />
        )}
      </FlexColumnItem>
      {isService && (
        <Buttons
          onFocusClick={onFocusClick}
          selectedNodeServiceName={selectedNodeServiceName}
        />
      )}
    </FlexColumnGroup>
  );
}
