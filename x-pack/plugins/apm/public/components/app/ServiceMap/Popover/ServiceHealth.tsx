/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { isNumber } from 'lodash';
import styled, { css } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { ItemRow, ItemTitle, ItemDescription } from './ServiceMetricList';
import { asDuration, asInteger, tpmUnit } from '../../../../utils/formatters';
import { getSeverity } from '../../../../../common/ml_job_constants';
import { getSeverityColor } from '../cytoscapeOptions';
import { useTheme } from '../../../../hooks/useTheme';
import { TRANSACTION_TYPE } from '../../../../../common/elasticsearch_fieldnames';

const AnomalyScore = styled.span<{
  readonly severityColor: string | undefined;
}>`
  font-weight: bold;
  ${(props) =>
    props.severityColor &&
    css`
      color: ${props.severityColor};
    `}
`;

const ActualValue = styled.span`
  color: silver;
`;

interface TransactionAnomaly {
  [TRANSACTION_TYPE]: string;
  anomaly_score: number;
  actual_value: number;
}

function getMaxAnomalyTransactionType(anomalies: TransactionAnomaly[] = []) {
  const maxScore = Math.max(
    ...anomalies.map(({ anomaly_score: anomalyScore }) => anomalyScore)
  );
  const maxAnomaly = anomalies.find(
    ({ anomaly_score: anomalyScore }) => anomalyScore === maxScore
  );
  return maxAnomaly?.[TRANSACTION_TYPE] ?? anomalies[0]?.[TRANSACTION_TYPE];
}

interface Props {
  anomalies: undefined | TransactionAnomaly[];
  transactionMetrics: ServiceNodeMetrics['transactionMetrics'];
}

export function ServiceHealth({ anomalies, transactionMetrics }: Props) {
  const theme = useTheme();
  const transactionTypes = useMemo(
    () =>
      Array.isArray(transactionMetrics)
        ? transactionMetrics.map(
            (transactionTypeMetrics) => transactionTypeMetrics[TRANSACTION_TYPE]
          )
        : [],
    [transactionMetrics]
  );
  const [selectedType, setSelectedType] = useState(
    getMaxAnomalyTransactionType(anomalies)
  );
  const selectedAnomaly = Array.isArray(anomalies)
    ? anomalies.find((anomaly) => anomaly[TRANSACTION_TYPE] === selectedType)
    : undefined;
  const selectedTransactionMetrics = transactionMetrics.find(
    (transactionTypeMetrics) =>
      transactionTypeMetrics[TRANSACTION_TYPE] === selectedType
  );

  useEffect(() => {
    setSelectedType(getMaxAnomalyTransactionType(anomalies));
  }, [anomalies]);

  const listItems = [];

  if (selectedTransactionMetrics?.avgTransactionDuration) {
    const { avgTransactionDuration } = selectedTransactionMetrics;
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverMetric',
        {
          defaultMessage: 'Trans. duration (avg.)',
        }
      ),
      description: isNumber(avgTransactionDuration)
        ? asDuration(avgTransactionDuration)
        : null,
    });
  }

  if (selectedAnomaly) {
    listItems.push({
      title: i18n.translate('xpack.apm.serviceMap.anomalyScorePopoverMetric', {
        defaultMessage: 'Anomaly score (max.)',
      }),
      description: (
        <>
          <AnomalyScore
            severityColor={getSeverityColor(
              theme,
              getSeverity(selectedAnomaly.anomaly_score)
            )}
          >
            {asInteger(selectedAnomaly.anomaly_score)}
          </AnomalyScore>
          &nbsp;
          <ActualValue>
            ({asDuration(selectedAnomaly.actual_value)})
          </ActualValue>
        </>
      ),
    });
  }

  if (selectedTransactionMetrics?.avgRequestsPerMinute) {
    const { avgRequestsPerMinute } = selectedTransactionMetrics;
    listItems.push({
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Req. per minute (avg.)',
        }
      ),
      description: isNumber(avgRequestsPerMinute)
        ? `${avgRequestsPerMinute.toFixed(2)} ${tpmUnit('request')}`
        : null,
    });
  }

  return (
    <>
      <EuiSelect
        compressed
        fullWidth
        prepend="Type"
        options={transactionTypes.map((type) => ({
          value: type,
          text: type,
        }))}
        onChange={(e) => {
          setSelectedType(e.target.value);
        }}
        defaultValue={selectedType}
      />
      <table>
        <tbody>
          {listItems.map(
            ({ title, description }) =>
              description && (
                <ItemRow key={title}>
                  <ItemTitle>{title}</ItemTitle>
                  <ItemDescription>{description}</ItemDescription>
                </ItemRow>
              )
          )}
        </tbody>
      </table>
    </>
  );
}
