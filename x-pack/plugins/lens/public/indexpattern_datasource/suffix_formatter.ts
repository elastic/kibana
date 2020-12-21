/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FieldFormat, KBN_FIELD_TYPES } from '../../../../../src/plugins/data/public';
import { FormatFactory } from '../types';
import { TimeScaleUnit } from './time_scale';

const unitSuffixes: Record<TimeScaleUnit, string> = {
  s: i18n.translate('xpack.lens.fieldFormats.suffix.s', { defaultMessage: '/s' }),
  m: i18n.translate('xpack.lens.fieldFormats.suffix.m', { defaultMessage: '/m' }),
  h: i18n.translate('xpack.lens.fieldFormats.suffix.h', { defaultMessage: '/h' }),
  d: i18n.translate('xpack.lens.fieldFormats.suffix.d', { defaultMessage: '/d' }),
};

export const unitSuffixesLong: Record<TimeScaleUnit, string> = {
  s: i18n.translate('xpack.lens.fieldFormats.longSuffix.s', { defaultMessage: 'per second' }),
  m: i18n.translate('xpack.lens.fieldFormats.longSuffix.m', { defaultMessage: 'per minute' }),
  h: i18n.translate('xpack.lens.fieldFormats.longSuffix.h', { defaultMessage: 'per hour' }),
  d: i18n.translate('xpack.lens.fieldFormats.longSuffix.d', { defaultMessage: 'per day' }),
};

export function getSuffixFormatter(formatFactory: FormatFactory) {
  return class SuffixFormatter extends FieldFormat {
    static id = 'suffix';
    static title = i18n.translate('xpack.lens.fieldFormats.suffix.title', {
      defaultMessage: 'Suffix',
    });
    static fieldType = KBN_FIELD_TYPES.NUMBER;
    allowsNumericalAggregations = true;

    getParamDefaults() {
      return {
        unit: undefined,
        nestedParams: {},
      };
    }

    textConvert = (val: unknown) => {
      const unit = this.param('unit') as TimeScaleUnit | undefined;
      const suffix = unit ? unitSuffixes[unit] : undefined;
      const nestedFormatter = this.param('id');
      const nestedParams = this.param('params');

      const formattedValue = formatFactory({ id: nestedFormatter, params: nestedParams }).convert(
        val
      );

      // do not add suffixes to empty strings
      if (formattedValue === '') {
        return '';
      }

      if (suffix) {
        return `${formattedValue}${suffix}`;
      }
      return formattedValue;
    };
  };
}
