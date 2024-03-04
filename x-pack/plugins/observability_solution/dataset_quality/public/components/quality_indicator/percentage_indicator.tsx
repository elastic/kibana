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

export function QualityPercentageIndicator({ percentage = 0 }: { percentage?: number }) {
  const quality = mapPercentageToQuality(percentage);

  const isFewDegradedDocsAvailable = percentage && percentage < FEW_DEGRADED_DOCS_THRESHOLD;

  const description = isFewDegradedDocsAvailable ? (
    <EuiText size="s">
      ~<FormattedNumber value={percentage} />%{' '}
      <EuiToolTip
        content={i18n.translate('xpack.datasetQuality.fewDegradedDocsTooltip', {
          defaultMessage: 'Few degraded docs in this dataset.',
        })}
      >
        <EuiIcon type="warning" color="warning" size="s" />
      </EuiToolTip>
    </EuiText>
  ) : (
    <EuiText size="s">
      <FormattedNumber value={percentage} />%
    </EuiText>
  );

  return <QualityIndicator quality={quality} description={description} />;
}
