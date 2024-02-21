/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { FormattedNumber } from '@kbn/i18n-react';
import React from 'react';
import { mapPercentageToQuality } from './helpers';
import { QualityIndicator } from './indicator';

export function QualityPercentageIndicator({ percentage = 0 }: { percentage?: number }) {
  const quality = mapPercentageToQuality(percentage);

  const description = (
    <EuiText size="s">
      <FormattedNumber value={percentage} />%
    </EuiText>
  );

  return <QualityIndicator quality={quality} description={description} />;
}
