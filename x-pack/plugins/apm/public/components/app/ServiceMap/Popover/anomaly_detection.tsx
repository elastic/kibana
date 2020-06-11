/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiIconTip,
  EuiHealth,
} from '@elastic/eui';
import { fontSize, px } from '../../../../style/variables';
import { asInteger } from '../../../../utils/formatters';
import { MLJobLink } from '../../../shared/Links/MachineLearningLinks/MLJobLink';
import { getSeverityColor, popoverMinWidth } from '../cytoscapeOptions';
import { getMetricChangeDescription } from '../../../../../../ml/public';
import { ServiceNode } from '../../../../../common/service_map';

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

interface AnomalyDetectionProps {
  serviceNodeData: cytoscape.NodeDataDefinition & ServiceNode;
}

export function AnomalyDetection({ serviceNodeData }: AnomalyDetectionProps) {
  const anomalySeverity = serviceNodeData.anomaly_severity;
  const anomalyScore = serviceNodeData.anomaly_score;
  const actualValue = serviceNodeData.actual_value;
  const typicalValue = serviceNodeData.typical_value;
  const mlJobId = serviceNodeData.ml_job_id;
  const hasAnomalyDetectionScore =
    anomalySeverity !== undefined && anomalyScore !== undefined;
  const anomalyDescription =
    hasAnomalyDetectionScore &&
    actualValue !== undefined &&
    typicalValue !== undefined
      ? getMetricChangeDescription(actualValue, typicalValue).message
      : null;

  return (
    <>
      <section>
        <HealthStatusTitle size="xxs">
          <h3>{ANOMALY_DETECTION_TITLE}</h3>
        </HealthStatusTitle>
        &nbsp;
        <EuiIconTip type="iInCircle" content={ANOMALY_DETECTION_TOOLTIP} />
        {!mlJobId && <EnableText>{ANOMALY_DETECTION_DISABLED_TEXT}</EnableText>}
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
                {getDisplayedAnomalyScore(anomalyScore as number)}
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
    </>
  );
}

function getDisplayedAnomalyScore(score: number) {
  if (score > 0 && score < 1) {
    return '< 1';
  }
  return asInteger(score);
}

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
    defaultMessage: `We couldn't find an anomaly score within the selected time range. See details in the anomaly explorer.`,
  }
);
