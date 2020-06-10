/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, MouseEvent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import { ThemeContext } from 'styled-components';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceMetricFetcher } from './ServiceMetricFetcher';
import { AnomalyDetection } from './anomaly_detection';
import { ServiceNode } from '../../../../../common/service_map';
import { popoverMinWidth } from '../cytoscapeOptions';

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

export const Contents = ({
  selectedNodeData,
  isService,
  label,
  onFocusClick,
  selectedNodeServiceName,
}: ContentsProps) => {
  const theme = useContext(ThemeContext);

  // Anomaly Detection
  const severity = selectedNodeData.severity;
  const maxScore = selectedNodeData.max_score;
  const actualValue = selectedNodeData.actual_value;
  const typicalValue = selectedNodeData.typical_value;
  const jobId = selectedNodeData.job_id;
  const hasAnomalyDetection = [
    severity,
    maxScore,
    actualValue,
    typicalValue,
    jobId,
  ].every((value) => value !== undefined);
  const anomalyDescription = hasAnomalyDetection
    ? getMetricChangeDescription(actualValue, typicalValue).message
    : null;

  return (
    <FlexColumnGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: popoverMinWidth }}
    >
      <FlexColumnItem>
        <EuiTitle size="xxs">
          <h3>{label}</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
      </FlexColumnItem>
      {isService && (
        <FlexColumnItem>
          <AnomalyDetection serviceNodeData={selectedNodeData as ServiceNode} />
          <EuiHorizontalRule margin="xs" />
        </FlexColumnItem>
      )}
      <FlexColumnItem>
        {isService ? (
          <ServiceMetricFetcher serviceName={selectedNodeServiceName} />
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
};
