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
  EuiIconTip,
  EuiHealth,
} from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { MouseEvent } from 'react';
import styled from 'styled-components';
import { fontSize, px } from '../../../../style/variables';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceMetricFetcher } from './ServiceMetricFetcher';
import { MLJobLink } from '../../../shared/Links/MachineLearningLinks/MLJobLink';
import { getSeverityColor } from '../cytoscapeOptions';
import { asInteger } from '../../../../utils/formatters';
import { getMetricChangeDescription } from '../../../../../../ml/public';

const popoverMinWidth = 280;

interface ContentsProps {
  isService: boolean;
  label: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
  selectedNodeServiceName: string;
}

const HealthStatusTitle = styled(EuiTitle)`
  display: inline;
  text-transform: uppercase;
`;

const VerticallyCentered = styled.div`
  display: flex;
  align-items: center;
`;

const SubduedText = styled.span`
  color: ${theme.euiTextSubduedColor};
`;

const EnableText = styled.section`
  color: ${theme.euiTextSubduedColor};
  line-height: 1.4;
  font-size: ${fontSize};
  width: ${px(popoverMinWidth)};
`;

export const ContentLine = styled.section`
  line-height: 2;
`;

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

const ANOMALY_DETECTION_TITLE = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverTitle',
  { defaultMessage: 'Anomaly Detection' }
);

const ANOMALY_DETECTION_TOOLTIP = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverTooltip',
  {
    defaultMessage:
      'Service health indicators are powered by the anomaly detection feature in machine learning',
  }
);

const ANOMALY_DETECTION_SCORE_METRIC = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverScoreMetric',
  { defaultMessage: 'Score (max.)' }
);

const ANOMALY_DETECTION_LINK = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverLink',
  { defaultMessage: 'View anomalies' }
);

const ANOMALY_DETECTION_DISABLED_TEXT = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverDisabled',
  {
    defaultMessage:
      'Display service health indicators by enabling anomaly detection from the Integrations menu in the Service details view.',
  }
);

const ANOMALY_DETECTION_NO_DATA_TEXT = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverNoData',
  {
    defaultMessage:
      'No anomaly score found with the current filters. See details in the anomaly explorer:',
  }
);

export function Contents({
  selectedNodeData,
  isService,
  label,
  onFocusClick,
  selectedNodeServiceName,
}: ContentsProps) {
  // Anomaly Detection
  const anomalySeverity = selectedNodeData.anomaly_severity;
  const anomalyScore = selectedNodeData.anomaly_score;
  const actualValue = selectedNodeData.actual_value;
  const typicalValue = selectedNodeData.typical_value;
  const mlJobId = selectedNodeData.ml_job_id;
  const hasAnomalyDetectionScore =
    anomalySeverity !== undefined && anomalyScore !== undefined;
  const anomalyDescription =
    hasAnomalyDetectionScore &&
    actualValue !== undefined &&
    typicalValue !== undefined
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
          <section>
            <HealthStatusTitle size="xxs">
              <h3>{ANOMALY_DETECTION_TITLE}</h3>
            </HealthStatusTitle>
            &nbsp;
            <EuiIconTip type="iInCircle" content={ANOMALY_DETECTION_TOOLTIP} />
            {!mlJobId && (
              <EnableText>{ANOMALY_DETECTION_DISABLED_TEXT}</EnableText>
            )}
          </section>
          {hasAnomalyDetectionScore && (
            <ContentLine>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <VerticallyCentered>
                    <EuiHealth color={getSeverityColor(anomalySeverity)} />
                    <SubduedText>{ANOMALY_DETECTION_SCORE_METRIC}</SubduedText>
                  </VerticallyCentered>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div>
                    {asInteger(anomalyScore)}
                    {anomalyDescription && (
                      <SubduedText>&nbsp;({anomalyDescription})</SubduedText>
                    )}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </ContentLine>
          )}
          {mlJobId && !hasAnomalyDetectionScore && (
            <EnableText>{ANOMALY_DETECTION_NO_DATA_TEXT}</EnableText>
          )}
          {mlJobId && (
            <ContentLine>
              <MLJobLink external jobId={mlJobId}>
                {ANOMALY_DETECTION_LINK}
              </MLJobLink>
            </ContentLine>
          )}
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
}
