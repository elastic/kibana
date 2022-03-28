/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  FieldFormat,
  FieldFormatInstanceType,
} from '../../../../../src/plugins/field_formats/common';
import type { FormatFactory } from '../types';
import type { TimeScaleUnit } from '../expressions/time_scale';

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

export const suffixFormatterId = 'suffix';

export function getSuffixFormatter(getFormatFactory: () => FormatFactory): FieldFormatInstanceType {
  return class SuffixFormatter extends FieldFormat {
    static id = suffixFormatterId;
    static hidden = true; // Don't want this format to appear in index pattern editor
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
      const suffix = unit ? unitSuffixes[unit] : this.param('suffixString');
      const nestedFormatter = this.param('id');
      const nestedParams = this.param('params');

      const formattedValue = getFormatFactory()({
        id: nestedFormatter,
        params: nestedParams,
      }).convert(val);

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
