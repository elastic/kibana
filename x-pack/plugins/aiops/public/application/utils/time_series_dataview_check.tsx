/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';

export function timeSeriesDataViewWarning(
  dataView: DataView,
  feature: 'change_point_detection' | 'log_categorization' | 'log_rate_analysis'
) {
  if (dataView.isTimeBased()) {
    return null;
  }

  let description = '';
  if (feature === 'change_point_detection') {
    description = i18n.translate('xpack.aiops.changePointTimeSeriesWarning.description', {
      defaultMessage: 'Change point detection only runs over time-based indices.',
    });
  } else if (feature === 'log_categorization') {
    description = i18n.translate('xpack.aiops.logCategorizationTimeSeriesWarning.description', {
      defaultMessage: 'Log pattern analysis only runs over time-based indices.',
    });
  } else if (feature === 'log_rate_analysis') {
    description = i18n.translate('xpack.aiops.logRateAnalysisTimeSeriesWarning.description', {
      defaultMessage: 'Log rate analysis only runs over time-based indices.',
    });
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.aiops.dataViewNotBasedOnTimeSeriesWarning.title', {
        defaultMessage: 'The data view "{dataViewTitle}" is not based on a time series.',
        values: { dataViewTitle: dataView.getName() },
      })}
      color="danger"
      iconType="warning"
    >
      <p>{description}</p>
    </EuiCallOut>
  );
}
