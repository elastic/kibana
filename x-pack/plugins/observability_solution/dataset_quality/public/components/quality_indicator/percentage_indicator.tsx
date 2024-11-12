/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';
import React from 'react';

const FEW_DOCS_THRESHOLD = 0.0005;

export function QualityPercentageIndicator({
  percentage,
  docsCount,
  tooltipContent,
}: {
  percentage: number;
  docsCount?: number;
  tooltipContent: (numberOfDocuments: number) => string;
}) {
  const isFewDocsAvailable = percentage && percentage < FEW_DOCS_THRESHOLD;

  return isFewDocsAvailable ? (
    <DatasetWithFewDocs docsCount={docsCount!} tooltipContent={tooltipContent} />
  ) : (
    <DatasetWithManyDocs percentage={percentage} />
  );
}

const DatasetWithFewDocs = ({
  docsCount,
  tooltipContent,
}: {
  docsCount: number;
  tooltipContent: (numberOfDocuments: number) => string;
}) => {
  return (
    <EuiText size="s">
      {i18n.translate('xpack.datasetQuality.datasetWithFewDocs.TextLabel', {
        defaultMessage: '~0%',
      })}{' '}
      <EuiToolTip content={tooltipContent(docsCount)}>
        <EuiIcon type="warning" color="warning" size="s" />
      </EuiToolTip>
    </EuiText>
  );
};

const DatasetWithManyDocs = ({ percentage }: { percentage: number }) => {
  return (
    <EuiText size="s">
      <FormattedNumber value={percentage} />%
    </EuiText>
  );
};
