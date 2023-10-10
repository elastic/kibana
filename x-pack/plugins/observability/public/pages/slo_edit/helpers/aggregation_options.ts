/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export const AGGREGATION_OPTIONS = [
  {
    value: 'avg',
    label: i18n.translate('xpack.observability.slo.sloEdit.timesliceMetric.aggregation.average', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: 'max',
    label: i18n.translate('xpack.observability.slo.sloEdit.timesliceMetric.aggregation.max', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: 'min',
    label: i18n.translate('xpack.observability.slo.sloEdit.timesliceMetric.aggregation.min', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: 'sum',
    label: i18n.translate('xpack.observability.slo.sloEdit.timesliceMetric.aggregation.sum', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: 'cardinality',
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.timesliceMetric.aggregation.cardinality',
      {
        defaultMessage: 'Cardinality',
      }
    ),
  },
  {
    value: 'last_value',
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.timesliceMetric.aggregation.last_value',
      {
        defaultMessage: 'Last value',
      }
    ),
  },
  {
    value: 'std_deviation',
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.timesliceMetric.aggregation.std_deviation',
      {
        defaultMessage: 'Std. Deviation',
      }
    ),
  },
  {
    value: 'doc_count',
    label: i18n.translate('xpack.observability.slo.sloEdit.timesliceMetric.aggregation.doc_count', {
      defaultMessage: 'Doc count',
    }),
  },
  {
    value: 'percentile',
    label: i18n.translate(
      'xpack.observability.slo.sloEdit.timesliceMetric.aggregation.percentile',
      {
        defaultMessage: 'Percentile',
      }
    ),
  },
];

export function aggValueToLabel(value: string) {
  const aggregation = AGGREGATION_OPTIONS.find((agg) => agg.value === value);
  if (aggregation) {
    return aggregation.label;
  }
  return value;
}
