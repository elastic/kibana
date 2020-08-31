/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { DocumentCountChart, DocumentCountChartPoint } from '../document_count_chart';

const CHART_WIDTH = 325;
const CHART_HEIGHT = 350;

export const DocumentCountContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { documentCounts, timeRangeEarliest, timeRangeLatest } = stats;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCounts !== undefined && documentCounts.buckets !== undefined) {
    const buckets: Record<string, number> = stats.documentCounts.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="spaceAround" gutterSize="s">
        <EuiFlexItem grow={false}>
          <DocumentCountChart
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            chartPoints={chartPoints}
            timeRangeEarliest={timeRangeEarliest}
            timeRangeLatest={timeRangeLatest}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceAround" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardDocumentCount.calculatedOverAllDocumentsLabel"
              defaultMessage="Calculated over all documents"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
