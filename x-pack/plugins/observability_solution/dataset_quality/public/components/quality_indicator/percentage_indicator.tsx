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
import { mapPercentageToQuality } from './helpers';
import { QualityIndicator } from './indicator';

const FEW_DEGRADED_DOCS_THRESHOLD = 0.0005;

export function QualityPercentageIndicator({
  percentage,
  degradedDocsCount,
}: {
  percentage: number;
  degradedDocsCount?: number;
}) {
  const quality = mapPercentageToQuality(percentage);

  const isFewDegradedDocsAvailable = percentage && percentage < FEW_DEGRADED_DOCS_THRESHOLD;

  const description = isFewDegradedDocsAvailable ? (
    <DatasetWithFewDegradedDocs degradedDocsCount={degradedDocsCount} />
  ) : (
    <DatasetWithManyDegradedDocs percentage={percentage} />
  );

  return <QualityIndicator quality={quality} description={description} />;
}

const DatasetWithFewDegradedDocs = ({ degradedDocsCount }: { degradedDocsCount?: number }) => {
  return (
    <EuiText size="s">
      ~0%{' '}
      <EuiToolTip
        content={i18n.translate('xpack.datasetQuality.fewDegradedDocsTooltip', {
          defaultMessage: '{degradedDocsCount} degraded docs in this dataset.',
          values: {
            degradedDocsCount,
          },
        })}
      >
        <EuiIcon type="warning" color="warning" size="s" />
      </EuiToolTip>
    </EuiText>
  );
};

const DatasetWithManyDegradedDocs = ({ percentage }: { percentage: number }) => {
  return (
    <EuiText size="s">
      <FormattedNumber value={percentage} />%
    </EuiText>
  );
};
