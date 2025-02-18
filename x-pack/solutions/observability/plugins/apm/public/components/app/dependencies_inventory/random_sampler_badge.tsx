/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

export function RandomSamplerBadge() {
  return (
    <>
      <EuiToolTip
        content={i18n.translate('xpack.apm.dependencies.randomSampler.tooltip', {
          defaultMessage:
            'This view is using random sampler aggregations due to the amount of data found in the selected time range. Sampling has been configured to balance accuracy and speed. Reduce the time range to see un-sampled data.',
        })}
      >
        <EuiBadge iconType="iInCircle" color="hollow">
          {i18n.translate('xpack.apm.dependencies.randomSampler.badge', {
            defaultMessage: `Based on sampled spans`,
          })}
        </EuiBadge>
      </EuiToolTip>
    </>
  );
}
