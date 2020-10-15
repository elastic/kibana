/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Produces a concise textual description of how the
 * actual value compares to the typical value for an anomaly.
 */

import { i18n } from '@kbn/i18n';

// Returns an Object containing a text message and EuiIcon type to
// describe how the actual value compares to the typical.
export function getMetricChangeDescription(
  actualProp: number[] | number,
  typicalProp: number[] | number
) {
  if (actualProp === undefined || typicalProp === undefined) {
    return { iconType: 'empty', message: '' };
  }

  let iconType: string = 'alert';
  let message: string;

  // For metric functions, actual and typical will be single value arrays.
  let actual: number = 0;
  let typical: number = 0;
  if (Array.isArray(actualProp)) {
    if (actualProp.length === 1) {
      actual = actualProp[0];
    } else {
      // lat_long anomalies currently the only multi-value case.
      // TODO - do we want to enhance the description depending on detector?
      // e.g. 'Unusual location' if using a lat_long detector.
      return {
        iconType: 'alert',
        message: i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unusualValuesDescription',
          {
            defaultMessage: 'Unusual values',
          }
        ),
      };
    }
  } else {
    actual = actualProp;
  }

  if (Array.isArray(typicalProp)) {
    if (typicalProp.length === 1) {
      typical = typicalProp[0];
    }
  } else {
    typical = typicalProp;
  }

  if (actual === typical) {
    // Very unlikely, but just in case.
    message = i18n.translate(
      'xpack.ml.formatters.metricChangeDescription.actualSameAsTypicalDescription',
      {
        defaultMessage: 'actual same as typical',
      }
    );
  } else {
    // For actual / typical gives output of the form:
    // 4 / 2        2x higher
    // 2 / 10       5x lower
    // 1000 / 1     More than 100x higher
    // 999 / 1000   Unusually low
    // 100 / -100   Unusually high
    // 0 / 100      Unexpected zero value
    // 1 / 0        Unexpected non-zero value
    const isHigher = actual > typical;
    iconType = isHigher ? 'sortUp' : 'sortDown';
    if (typical !== 0 && actual !== 0) {
      const factor: number = isHigher ? actual / typical : typical / actual;
      if (factor > 1.5) {
        if (factor <= 100) {
          message = isHigher
            ? i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThanOneAndHalfxHigherDescription',
                {
                  defaultMessage: '{factor}x higher',
                  values: { factor: Math.round(factor) },
                }
              )
            : i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThanOneAndHalfxLowerDescription',
                {
                  defaultMessage: '{factor}x lower',
                  values: { factor: Math.round(factor) },
                }
              );
        } else {
          message = isHigher
            ? i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThan100xHigherDescription',
                {
                  defaultMessage: 'More than 100x higher',
                }
              )
            : i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThan100xLowerDescription',
                {
                  defaultMessage: 'More than 100x lower',
                }
              );
        }
      } else if (factor >= 1.05) {
        message = isHigher
          ? i18n.translate(
              'xpack.ml.formatters.metricChangeDescription.moreThanOneAndFiveHundredthsxHigherDescription',
              {
                defaultMessage: '{factor}x higher',
                values: { factor: factor.toPrecision(2) },
              }
            )
          : i18n.translate(
              'xpack.ml.formatters.metricChangeDescription.moreThanOneAndFiveHundredthsxLowerDescription',
              {
                defaultMessage: '{factor}x lower',
                values: { factor: factor.toPrecision(2) },
              }
            );
      } else {
        message = isHigher
          ? i18n.translate('xpack.ml.formatters.metricChangeDescription.unusuallyHighDescription', {
              defaultMessage: 'Unusually high',
            })
          : i18n.translate('xpack.ml.formatters.metricChangeDescription.unusuallyLowDescription', {
              defaultMessage: 'Unusually low',
            });
      }
    } else {
      if (actual === 0) {
        message = i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unexpectedZeroValueDescription',
          {
            defaultMessage: 'Unexpected zero value',
          }
        );
      } else {
        message = i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unexpectedNonZeroValueDescription',
          {
            defaultMessage: 'Unexpected non-zero value',
          }
        );
      }
    }
  }

  return { iconType, message };
}
