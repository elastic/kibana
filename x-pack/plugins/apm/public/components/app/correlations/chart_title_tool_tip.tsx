/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ChartTitleToolTip() {
  return (
    <EuiIconTip
      content={i18n.translate(
        'xpack.apm.correlations.latencyCorrelations.titleHelp',
        {
          defaultMessage:
            'The chart uses logarithmic scales on both axes to avoid outliers distorting it',
        }
      )}
      position="right"
    />
  );
}
