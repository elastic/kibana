/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, EuiIconTip, EuiTitle, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ServiceAnomalyStats } from '../../../../../common/anomaly_detection';
import { getSeverityColor } from '../../../../../common/anomaly_detection';
import { TRANSACTION_REQUEST } from '../../../../../common/transaction_types';
import { asDuration, asInteger } from '../../../../../common/utils/formatters';
import { MLSingleMetricLink } from '../../../shared/links/machine_learning_links/mlsingle_metric_link';
import { POPOVER_WIDTH } from './constants';

interface Props {
  serviceName: string;
  serviceAnomalyStats: ServiceAnomalyStats | undefined;
}
export function AnomalyDetection({ serviceName, serviceAnomalyStats }: Props) {
  const { euiTheme } = useEuiTheme();
  const { fontSize: fontSizeS } = useEuiFontSize('s');

  const anomalySectionTitleStyles = css`
    display: inline;
    text-transform: uppercase;
  `;

  const verticallyCenteredStyles = css`
    display: flex;
    align-items: center;
  `;

  const subduedTextStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const enableTextStyles = css`
    color: ${euiTheme.colors.textSubdued};
    line-height: 1.4;
    font-size: ${fontSizeS};
    width: ${POPOVER_WIDTH}px;
  `;

  const contentLineStyles = css`
    line-height: 2;
  `;

  const anomalyScore = serviceAnomalyStats?.anomalyScore;
  const actualValue = serviceAnomalyStats?.actualValue;
  const mlJobId = serviceAnomalyStats?.jobId;
  const transactionType = serviceAnomalyStats?.transactionType ?? TRANSACTION_REQUEST;
  const hasAnomalyDetectionScore = anomalyScore !== undefined;

  return (
    <>
      <section>
        <EuiTitle size="xxs" css={anomalySectionTitleStyles}>
          <h3>{ANOMALY_DETECTION_TITLE}</h3>
        </EuiTitle>
        &nbsp;
        <EuiIconTip type="info" content={ANOMALY_DETECTION_TOOLTIP} />
        {!mlJobId && <section css={enableTextStyles}>{ANOMALY_DETECTION_DISABLED_TEXT}</section>}
      </section>
      {hasAnomalyDetectionScore && (
        <section css={contentLineStyles}>
          <div css={verticallyCenteredStyles}>
            <EuiHealth color={getSeverityColor(anomalyScore as number)}>
              <span>
                {i18n.translate('xpack.apm.serviceMap.anomalyDetectionPopoverScoreWithValue', {
                  defaultMessage: '{metric}: {score}',
                  values: {
                    metric: ANOMALY_DETECTION_SCORE_METRIC,
                    score: getDisplayedAnomalyScore(anomalyScore as number),
                  },
                })}
                {actualValue ? (
                  <span css={subduedTextStyles}> ({asDuration(actualValue)})</span>
                ) : null}
              </span>
            </EuiHealth>
          </div>
        </section>
      )}
      {mlJobId && !hasAnomalyDetectionScore && (
        <section css={enableTextStyles}>{ANOMALY_DETECTION_NO_DATA_TEXT}</section>
      )}
      {mlJobId && (
        <section css={contentLineStyles}>
          <MLSingleMetricLink
            external
            jobId={mlJobId}
            serviceName={serviceName}
            transactionType={transactionType}
          >
            {ANOMALY_DETECTION_LINK}
          </MLSingleMetricLink>
        </section>
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

// Same copy as service inventory "Anomalies" column header tooltip (`apm_services_table.tsx`).
const ANOMALY_DETECTION_TOOLTIP = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverTooltip',
  {
    defaultMessage:
      'The anomaly score (max.) is the maximum ML anomaly score detected for the service in the selected time range.',
  }
);

const ANOMALY_DETECTION_SCORE_METRIC = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverScoreMetric',
  { defaultMessage: 'Score (max.)' }
);

const ANOMALY_DETECTION_LINK = i18n.translate('xpack.apm.serviceMap.anomalyDetectionPopoverLink', {
  defaultMessage: 'View anomalies',
});

const ANOMALY_DETECTION_DISABLED_TEXT = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverDisabled',
  {
    defaultMessage:
      'Show anomaly scores on the service map by enabling anomaly detection in APM settings.',
  }
);

const ANOMALY_DETECTION_NO_DATA_TEXT = i18n.translate(
  'xpack.apm.serviceMap.anomalyDetectionPopoverNoData',
  {
    defaultMessage: `We couldn't find an anomaly score within the selected time range. See details in the anomaly explorer.`,
  }
);
