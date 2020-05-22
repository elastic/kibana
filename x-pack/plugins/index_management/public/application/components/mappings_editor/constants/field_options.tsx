/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';

import { DataType, ParameterName, SelectOption, SuperSelectOption, ComboBoxOption } from '../types';
import { FIELD_OPTIONS_TEXTS, LANGUAGE_OPTIONS_TEXT, FieldOption } from './field_options_i18n';
import { INDEX_DEFAULT, STANDARD } from './default_values';
import { MAIN_DATA_TYPE_DEFINITION } from './data_types_definition';

export const TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL: DataType[] = ['join'];

export const TYPE_NOT_ALLOWED_MULTIFIELD: DataType[] = [
  ...TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL,
  'object',
  'nested',
  'alias',
];

export const FIELD_TYPES_OPTIONS = Object.entries(MAIN_DATA_TYPE_DEFINITION).map(
  ([dataType, { label }]) => ({
    value: dataType,
    label,
  })
) as ComboBoxOption[];

interface SuperSelectOptionConfig {
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}

export const getSuperSelectOption = (
  title: string,
  description: string
): SuperSelectOptionConfig => ({
  inputDisplay: title,
  dropdownDisplay: (
    <>
      <strong>{title}</strong>
      <EuiText size="s" color="subdued">
        <p className="euiTextColor--subdued">{description}</p>
      </EuiText>
    </>
  ),
});

const getOptionTexts = (option: FieldOption): SuperSelectOptionConfig =>
  getSuperSelectOption(FIELD_OPTIONS_TEXTS[option].title, FIELD_OPTIONS_TEXTS[option].description);

type ParametersOptions = ParameterName | 'languageAnalyzer';

export const PARAMETERS_OPTIONS: {
  [key in ParametersOptions]?: SelectOption[] | SuperSelectOption[];
} = {
  index_options: [
    {
      value: 'docs',
      ...getOptionTexts('indexOptions.docs'),
    },
    {
      value: 'freqs',
      ...getOptionTexts('indexOptions.freqs'),
    },
    {
      value: 'positions',
      ...getOptionTexts('indexOptions.positions'),
    },
    {
      value: 'offsets',
      ...getOptionTexts('indexOptions.offsets'),
    },
  ] as SuperSelectOption[],
  index_options_flattened: [
    {
      value: 'docs',
      ...getOptionTexts('indexOptions.docs'),
    },
    {
      value: 'freqs',
      ...getOptionTexts('indexOptions.freqs'),
    },
  ] as SuperSelectOption[],
  index_options_keyword: [
    {
      value: 'docs',
      ...getOptionTexts('indexOptions.docs'),
    },
    {
      value: 'freqs',
      ...getOptionTexts('indexOptions.freqs'),
    },
  ] as SuperSelectOption[],
  analyzer: [
    {
      value: INDEX_DEFAULT,
      ...getOptionTexts('analyzer.indexDefault'),
    },
    {
      value: STANDARD,
      ...getOptionTexts('analyzer.standard'),
    },
    {
      value: 'simple',
      ...getOptionTexts('analyzer.simple'),
    },
    {
      value: 'whitespace',
      ...getOptionTexts('analyzer.whitespace'),
    },
    {
      value: 'stop',
      ...getOptionTexts('analyzer.stop'),
    },
    {
      value: 'keyword',
      ...getOptionTexts('analyzer.keyword'),
    },
    {
      value: 'pattern',
      ...getOptionTexts('analyzer.pattern'),
    },
    {
      value: 'fingerprint',
      ...getOptionTexts('analyzer.fingerprint'),
    },
    {
      value: 'language',
      ...getOptionTexts('analyzer.language'),
    },
  ] as SuperSelectOption[],
  languageAnalyzer: Object.entries(LANGUAGE_OPTIONS_TEXT).map(([value, text]) => ({
    value,
    text,
  })),
  similarity: [
    {
      value: 'BM25',
      ...getOptionTexts('similarity.bm25'),
    },
    {
      value: 'boolean',
      ...getOptionTexts('similarity.boolean'),
    },
  ] as SuperSelectOption[],
  term_vector: [
    {
      value: 'no',
      ...getOptionTexts('termVector.no'),
    },
    {
      value: 'yes',
      ...getOptionTexts('termVector.yes'),
    },
    {
      value: 'with_positions',
      ...getOptionTexts('termVector.withPositions'),
    },
    {
      value: 'with_offsets',
      ...getOptionTexts('termVector.withOffsets'),
    },
    {
      value: 'with_positions_offsets',
      ...getOptionTexts('termVector.withPositionsOffsets'),
    },
    {
      value: 'with_positions_payloads',
      ...getOptionTexts('termVector.withPositionsPayloads'),
    },
    {
      value: 'with_positions_offsets_payloads',
      ...getOptionTexts('termVector.withPositionsOffsetsPayloads'),
    },
  ] as SuperSelectOption[],
  orientation: [
    {
      value: 'ccw',
      ...getOptionTexts('orientation.counterclockwise'),
    },
    {
      value: 'cw',
      ...getOptionTexts('orientation.clockwise'),
    },
  ] as SuperSelectOption[],
};

const DATE_FORMATS = [
  { label: 'epoch_millis' },
  { label: 'epoch_second' },
  { label: 'date_optional_time', strict: true },
  { label: 'basic_date' },
  { label: 'basic_date_time' },
  { label: 'basic_date_time_no_millis' },
  { label: 'basic_ordinal_date' },
  { label: 'basic_ordinal_date_time' },
  { label: 'basic_ordinal_date_time_no_millis' },
  { label: 'basic_time' },
  { label: 'basic_time_no_millis' },
  { label: 'basic_t_time' },
  { label: 'basic_t_time_no_millis' },
  { label: 'basic_week_date', strict: true },
  { label: 'basic_week_date_time', strict: true },
  {
    label: 'basic_week_date_time_no_millis',
    strict: true,
  },
  { label: 'date', strict: true },
  { label: 'date_hour', strict: true },
  { label: 'date_hour_minute', strict: true },
  { label: 'date_hour_minute_second', strict: true },
  {
    label: 'date_hour_minute_second_fraction',
    strict: true,
  },
  {
    label: 'date_hour_minute_second_millis',
    strict: true,
  },
  { label: 'date_time', strict: true },
  { label: 'date_time_no_millis', strict: true },
  { label: 'hour', strict: true },
  { label: 'hour_minute ', strict: true },
  { label: 'hour_minute_second', strict: true },
  { label: 'hour_minute_second_fraction', strict: true },
  { label: 'hour_minute_second_millis', strict: true },
  { label: 'ordinal_date', strict: true },
  { label: 'ordinal_date_time', strict: true },
  { label: 'ordinal_date_time_no_millis', strict: true },
  { label: 'time', strict: true },
  { label: 'time_no_millis', strict: true },
  { label: 't_time', strict: true },
  { label: 't_time_no_millis', strict: true },
  { label: 'week_date', strict: true },
  { label: 'week_date_time', strict: true },
  { label: 'week_date_time_no_millis', strict: true },
  { label: 'weekyear', strict: true },
  { label: 'weekyear_week', strict: true },
  { label: 'weekyear_week_day', strict: true },
  { label: 'year', strict: true },
  { label: 'year_month', strict: true },
  { label: 'year_month_day', strict: true },
];

const STRICT_DATE_FORMAT_OPTIONS = DATE_FORMATS.filter((format) => format.strict).map(
  ({ label }) => ({
    label: `strict_${label}`,
  })
);

const DATE_FORMAT_OPTIONS = DATE_FORMATS.map(({ label }) => ({ label }));

export const ALL_DATE_FORMAT_OPTIONS = [...DATE_FORMAT_OPTIONS, ...STRICT_DATE_FORMAT_OPTIONS];
