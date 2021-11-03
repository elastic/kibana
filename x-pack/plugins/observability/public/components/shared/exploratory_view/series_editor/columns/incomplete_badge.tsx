/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { SeriesConfig, SeriesUrl } from '../../types';

interface Props {
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export function IncompleteBadge({ seriesConfig, series }: Props) {
  const { loading } = useAppIndexPatternContext();

  if (!seriesConfig) {
    return null;
  }
  const { dataType, reportDefinitions, selectedMetricField } = series;
  const { definitionFields, labels } = seriesConfig;
  const isIncomplete =
    (!dataType || isEmpty(reportDefinitions) || !selectedMetricField) && !loading;

  const incompleteDefinition = isEmpty(reportDefinitions)
    ? i18n.translate('xpack.observability.overview.exploratoryView.missingReportDefinition', {
        defaultMessage: 'Missing {reportDefinition}',
        values: {
          reportDefinition:
            labels?.[
              typeof definitionFields[0] === 'string'
                ? definitionFields[0]
                : definitionFields[0].field
            ],
        },
      })
    : '';

  let incompleteMessage = !selectedMetricField ? MISSING_REPORT_METRIC_LABEL : incompleteDefinition;

  if (!dataType) {
    incompleteMessage = MISSING_DATA_TYPE_LABEL;
  }

  if (!isIncomplete) {
    return null;
  }

  return <EuiBadge color="warning">{incompleteMessage}</EuiBadge>;
}

const MISSING_REPORT_METRIC_LABEL = i18n.translate(
  'xpack.observability.overview.exploratoryView.missingReportMetric',
  {
    defaultMessage: 'Missing report metric',
  }
);

const MISSING_DATA_TYPE_LABEL = i18n.translate(
  'xpack.observability.overview.exploratoryView.missingDataType',
  {
    defaultMessage: 'Missing data type',
  }
);
