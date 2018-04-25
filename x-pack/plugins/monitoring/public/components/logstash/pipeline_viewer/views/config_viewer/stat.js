/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { formatMetric } from '../../../../../lib/format_number';

const getMetricValuesFromStat = ({ stat }) => {
  if (!stat) {
    return null;
  }

  return stat.data.map(bucket => bucket.length > 1 ? bucket[1] : null);
};

const getReducedValueForMetric = ({ values, reducer, operation }) => {
  if (values === null || values.length === 0) {
    return null;
  }

  const value = values.reduce(reducer);

  return operation !== null
    ? operation(value)
    : value;
};

export class Stat {
  constructor(value, isHighlighted) {
    this.value = value;
    this.isHighlighted = isHighlighted;
  }

  static fromMetric(
    stats,
    name,
    format,
    suffix,
    reducer,
    operation,
    isHighlighted
  ) {
    const values = getMetricValuesFromStat({ stat: stats[name] });
    const finalValue = getReducedValueForMetric({ values, reducer, operation });
    const formattedValue = formatMetric(finalValue, format, suffix);

    return new Stat(formattedValue, isHighlighted);
  }
}